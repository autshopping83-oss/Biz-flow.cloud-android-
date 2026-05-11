
import html2canvas from 'html2canvas';
import { BluetoothPrinter } from "../types";
import { BleClient, numbersToDataView, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

declare global {
  interface Navigator {
    bluetooth: any;
  }
  interface Window {
    showDirectoryPicker?: any;
    deferredPrompt?: any; 
  }
}

// Standard UUIDs for ESC/POS Printers (SPP or Generic)
const PRINT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'; 
const WRITE_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

export const connectToPrinter = async (): Promise<BluetoothPrinter | null> => {
  try {
    // --- NATIVE PLATFORM (ANDROID/IOS) ---
    if (Capacitor.isNativePlatform()) {
      await BleClient.initialize();
      const device = await BleClient.requestDevice({
        optionalServices: [PRINT_SERVICE_UUID, 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '0000ae00-0000-1000-8000-00805f9b34fb']
      });
      
      await BleClient.connect(device.deviceId);
      return { 
        id: device.deviceId, 
        name: device.name || 'Impressora Bluetooth',
        isNative: true 
      } as any;
    }

    // --- WEB PLATFORM ---
    if (!navigator.bluetooth) {
      alert("Seu navegador não suporta Web Bluetooth. Use Chrome no Android ou Desktop.");
      return null;
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [PRINT_SERVICE_UUID, 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '0000ae00-0000-1000-8000-00805f9b34fb']
    });

    if (device.gatt) {
      await device.gatt.connect();
      return device as unknown as BluetoothPrinter;
    }
    return null;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('aborted')) return null;
    console.error("Erro Bluetooth:", error);
    return null;
  }
};

export const printTicket = async (device: BluetoothPrinter, element: HTMLElement) => {
  const PRINTER_WIDTH = 384; 
  
  let canvas;
  try {
      canvas = await html2canvas(element, {
        scale: 1,
        width: element.offsetWidth, 
        windowWidth: element.offsetWidth,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
  } catch (e: any) {
      throw new Error("Erro ao renderizar recibo: " + (e.message || "Falha desconhecida"));
  }

  if (!canvas) throw new Error("Canvas vazio.");

  const scaleFactor = PRINTER_WIDTH / canvas.width;
  const finalHeight = canvas.height * scaleFactor;
  
  const printCanvas = document.createElement('canvas');
  printCanvas.width = PRINTER_WIDTH;
  printCanvas.height = finalHeight;
  const ctx = printCanvas.getContext('2d');
  if(!ctx) throw new Error("Canvas context error");
  
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, PRINTER_WIDTH, finalHeight);
  ctx.drawImage(canvas, 0, 0, PRINTER_WIDTH, finalHeight);

  const imgData = ctx.getImageData(0, 0, PRINTER_WIDTH, finalHeight);
  const commands = encodeEscPos(imgData);

  // --- NATIVE PRINTING ---
  if ((device as any).isNative) {
    const deviceId = (device as any).id;
    try {
      // Find service and characteristic
      const services = await BleClient.getServices(deviceId);
      let targetService = services.find(s => s.uuid === PRINT_SERVICE_UUID || s.uuid === '0000ae00-0000-1000-8000-00805f9b34fb');
      if (!targetService) targetService = services[0];

      let targetChar = targetService.characteristics.find(c => c.uuid === WRITE_CHARACTERISTIC_UUID || c.properties.write || c.properties.writeWithoutResponse);
      if (!targetChar) targetChar = targetService.characteristics[0];

      const CHUNK_SIZE = 512;
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(i, i + CHUNK_SIZE);
        await BleClient.write(deviceId, targetService.uuid, targetChar.uuid, numbersToDataView(Array.from(chunk)));
        await new Promise(r => setTimeout(r, 20));
      }
      return;
    } catch (e) {
      console.error("Native print error:", e);
      throw new Error("Falha ao imprimir nativamente.");
    }
  }

  // --- WEB PRINTING ---
  const server = device.gatt;
  if (!server) throw new Error("Dispositivo Bluetooth inválido (Sem GATT).");
  if (!server.connected) await server.connect();

  let service;
  try {
     service = await server.getPrimaryService(PRINT_SERVICE_UUID);
  } catch(e) {
     try { service = await server.getPrimaryService('0000ae00-0000-1000-8000-00805f9b34fb'); } catch(e2) {}
     if(!service) try { service = await server.getPrimaryService('e7810a71-73ae-499d-8c15-faa9aef0c3f2'); } catch(e3) {}
  }
  
  if (!service) {
      try {
        const services = await server.getPrimaryServices();
        if(services && services.length > 0) service = services[0];
      } catch (e) {}
  }

  if (!service) throw new Error("Serviço de impressão não encontrado.");

  let characteristic;
  try {
      characteristic = await service.getCharacteristic(WRITE_CHARACTERISTIC_UUID);
  } catch (e) {
      try {
          const characteristics = await service.getCharacteristics();
          characteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
      } catch (e2) {}
  }

  if (!characteristic) throw new Error("Característica de escrita não encontrada.");

  const CHUNK_SIZE = 512; 
  for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
    const chunk = commands.slice(i, i + CHUNK_SIZE);
    await characteristic.writeValue(chunk);
    await new Promise(r => setTimeout(r, 20));
  }
};

// --- ESC/POS ENCODING LOGIC (Raster Bit Image GS v 0) ---
const encodeEscPos = (imgData: ImageData): Uint8Array => {
  const width = imgData.width;
  const height = imgData.height;
  const data = imgData.data;

  // Calculate bytes per row (width / 8, rounded up)
  const bytesPerRow = Math.ceil(width / 8);
  
  // Header: Initialize, Align Center
  const init = [0x1B, 0x40]; 
  const alignCenter = [0x1B, 0x61, 0x01];
  
  // Raster Bit Image Command: GS v 0 m xL xH yL yH d1...vk
  const command = [0x1D, 0x76, 0x30, 0x00];
  command.push(bytesPerRow % 256);
  command.push(Math.floor(bytesPerRow / 256));
  command.push(height % 256);
  command.push(Math.floor(height / 256));

  // Bitmap Data
  const bitmap: number[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bytesPerRow; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        if (pixelX < width) {
          const offset = (y * width + pixelX) * 4;
          // RGB to Grayscale
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];
          const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
          
          // Thresholding
          if (luminance < 128) {
            byte |= (1 << (7 - bit));
          }
        }
      }
      bitmap.push(byte);
    }
  }

  // Footer: Feed lines (3) and Cut (GS V 66 0)
  const footer = [0x1B, 0x64, 0x03, 0x1D, 0x56, 0x42, 0x00];

  const fullBuffer = new Uint8Array(init.length + alignCenter.length + command.length + bitmap.length + footer.length);
  fullBuffer.set(init, 0);
  fullBuffer.set(alignCenter, init.length);
  fullBuffer.set(command, init.length + alignCenter.length);
  fullBuffer.set(bitmap, init.length + alignCenter.length + command.length);
  fullBuffer.set(footer, init.length + alignCenter.length + command.length + bitmap.length);

  return fullBuffer;
};
