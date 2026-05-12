export interface PrinterSettings {
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  printerType: 'network' | 'bluetooth' | 'usb' | 'system';
  paperSize: '80mm' | '58mm' | 'A4';
  isDefault: boolean;
  autoConnect: boolean;
  enableTestPrint: boolean;
}

export interface PrinterConnectionStatus {
  connected: boolean;
  printerName?: string;
  lastTested?: Date;
  error?: string;
}
