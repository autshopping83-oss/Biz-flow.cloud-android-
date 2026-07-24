// src/features/bluetooth/BLEPrinterService.ts
// Serviço de impressão BLE para impressoras térmicas
// Usa BleClient (positional args) do @capacitor-community/bluetooth-le

import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';

export interface PrinterDevice {
  deviceId: string;
  name: string;
}

// Flag para evitar múltiplas inicializações
let bleInitialized = false;
let bleInitializing = false;
let bleInitCallbacks: Array<() => void> = [];

export const BLEPrinterService = {
  devices: [] as PrinterDevice[],
  connectedDeviceId: null as string | null,

  /**
   * Inicializa o BLE (chamado pelo lifecycle do app, NÃO por scanDevices/print)
   * Deve ser chamado APÓS o Capacitor bridge estar pronto (appStateChange listener)
   */
  async initialize(): Promise<void> {
    if (bleInitialized) return;
    if (bleInitializing) {
      return new Promise(resolve => bleInitCallbacks.push(resolve));
    }
    bleInitializing = true;

    const capacitor = (window as any).Capacitor;
    if (!capacitor?.isNativePlatform()) {
      bleInitializing = false;
      bleInitCallbacks.forEach(cb => cb());
      bleInitCallbacks = [];
      return;
    }

    try {
      // Verificar se Bluetooth está ativo no dispositivo
      const enabled = await BleClient.isEnabled();
      if (!enabled) {
        bleInitializing = false;
        bleInitCallbacks.forEach(cb => cb());
        bleInitCallbacks = [];
        return; // Graceful: Bluetooth desligado, app continua a funcionar
      }

      // Pedir permissões Bluetooth em runtime (obrigatório para Android 12+)
      await BleClient.initialize({ androidNeverForLocation: true });
      bleInitialized = true;
    } catch (e) {
      console.warn('BLE initialize failed:', e);
      // Graceful degradation: app nao quebra, impressao nao disponivel
    } finally {
      bleInitializing = false;
      bleInitCallbacks.forEach(cb => cb());
      bleInitCallbacks = [];
    }
  },

  /**
   * Verifica se BLE está disponível (sincrono, sem inicializar)
   */
  isAvailable(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  },

  /**
   * Escaneia dispositivos BLE próximos
   */
  async scanDevices(timeout = 8000): Promise<PrinterDevice[]> {
    if (!bleInitialized) {
      throw new Error('Bluetooth não disponível. Verifique se o Bluetooth está ligado nas definições do dispositivo.');
    }
    // Verificar novamente se Bluetooth continua ativo
    try {
      const enabled = await BleClient.isEnabled();
      if (!enabled) {
        throw new Error('Bluetooth está desligado. Ligue o Bluetooth nas definições do dispositivo.');
      }
    } catch {
      throw new Error('Não foi possível verificar o Bluetooth. Reinicie a app.');
    }
    this.devices = [];

    // Escanear dispositivos
    await BleClient.requestLEScan(
      { scanMode: 2 }, // SCAN_MODE_LOW_LATENCY
      (result) => {
        if (result.device?.name && result.device?.deviceId) {
          const name = result.device.name;
          const deviceId = result.device.deviceId;
          // Evitar duplicatas
          if (!this.devices.find(d => d.deviceId === deviceId)) {
            this.devices.push({ deviceId, name });
          }
        }
      }
    );

    // Aguardar o tempo de scan
    await new Promise(resolve => setTimeout(resolve, timeout));

    // Parar scan
    await BleClient.stopLEScan();
    return this.devices;
  },

  /**
   * Conecta a um dispositivo BLE
   */
  async connect(deviceId: string): Promise<void> {
    try {
      // Timeout de 15s para conexão BLE
      await Promise.race([
        BleClient.connect(deviceId, (disconnectedId: string) => {
          console.log('BLE device disconnected:', disconnectedId);
          if (this.connectedDeviceId === disconnectedId) {
            this.connectedDeviceId = null;
          }
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite de conexão excedido (15s)')), 15000)
        ),
      ]);
      this.connectedDeviceId = deviceId;
    } catch (error) {
      throw new Error(`Falha ao conectar: ${(error as Error).message}`);
    }
  },

  /**
   * Desconecta do dispositivo atual
   */
  async disconnect(): Promise<void> {
    if (this.connectedDeviceId) {
      try {
        await BleClient.disconnect(this.connectedDeviceId);
      } catch {
        // Silencioso
      }
      this.connectedDeviceId = null;
    }
  },

  /**
   * Envia dados para a impressora
   */
  async print(data: Uint8Array): Promise<void> {
    if (!this.connectedDeviceId) {
      throw new Error('Nenhuma impressora conectada.');
    }

    const deviceId = this.connectedDeviceId;

    try {
      // Obter serviços do dispositivo
      const services = await BleClient.getServices(deviceId);

      // Procurar um serviço e característica que suportem escrita
      for (const service of services) {
        for (const char of service.characteristics) {
          if (char.properties?.write || char.properties?.writeWithoutResponse) {
            // Encontrámos uma característica de escrita
            // Dividir em pacotes (limite de MTU ~512 bytes)
            const MTU = 480; // margem de segurança
            for (let i = 0; i < data.length; i += MTU) {
              const chunk = data.slice(i, i + MTU);
              const dataView = numbersToDataView(Array.from(chunk));
              if (char.properties.write) {
                await BleClient.write(deviceId, service.uuid, char.uuid, dataView);
              } else {
                await BleClient.writeWithoutResponse(deviceId, service.uuid, char.uuid, dataView);
              }
            }
            return; // Sucesso
          }
        }
      }

      throw new Error('Nenhuma característica de escrita encontrada na impressora.');
    } catch (error) {
      throw new Error(`Erro de impressão: ${(error as Error).message}`);
    }
  },

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.connectedDeviceId !== null;
  },

  /**
   * Retorna o ID do dispositivo conectado
   */
  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  },
};
