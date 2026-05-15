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
    backgroundColor: "#FFFFFF"
  }
};

export default config;
