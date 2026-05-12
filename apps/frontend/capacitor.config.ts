import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dasadove.app',
  appName: 'dasadove',
  webDir: 'dist/DasaDovePos/browser', // Add /browser to the path
  server: {
    androidScheme: 'https',
  },
};

export default config;
