export interface BluetoothPrinter {
  id: string;
  name: string;
  address?: string;
  isConnecting?: boolean;
  isConnected?: boolean;
  isPaired?: boolean;
  rssi?: number;
}

export interface SavedPrinterConnection {
  deviceId: string;
  deviceName: string;
  deviceAddress: string;
  connectedAt: Date;
  autoConnect: boolean;
}

export interface BluetoothWriteOptions {
  deviceId: string;
  service: string;
  characteristic: string;
  value: DataView;
}
