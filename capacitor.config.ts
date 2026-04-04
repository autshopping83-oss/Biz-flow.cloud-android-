import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bizflow.app',
  appName: 'BizFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Procurando impressoras...",
        availableDevices: "Dispositivos disponíveis",
        noDeviceFound: "Nenhuma impressora encontrada"
      }
    }
  },
  android: {
    adaptiveIcon: {
      foreground: "logo.svg",
      background: "#FFFFFF"
    }
  }
};

export default config;
