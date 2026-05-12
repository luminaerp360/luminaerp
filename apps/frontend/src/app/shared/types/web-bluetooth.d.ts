interface BluetoothCharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

interface BluetoothCharacteristic {
  properties: BluetoothCharacteristicProperties;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getPrimaryService(serviceUUID: string): Promise<BluetoothRemoteGATTService>;
  getCharacteristics(): Promise<BluetoothCharacteristic[]>;
  getCharacteristic(
    characteristicUUID: string
  ): Promise<BluetoothCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(serviceUUID: string): Promise<BluetoothRemoteGATTService>;
  connected: boolean;
}

interface BluetoothDevice extends EventTarget {
  id: string;
  name: string | null;
  gatt: BluetoothRemoteGATTServer;
  addEventListener(
    type: 'gattserverdisconnected',
    listener: (event: Event) => void
  ): void;
  removeEventListener(
    type: 'gattserverdisconnected',
    listener: (event: Event) => void
  ): void;
}

interface BluetoothRequestDeviceFilter {
  services?: string[];
  name?: string;
  namePrefix?: string;
  manufacturerId?: number;
  serviceDataUUID?: string;
}

interface RequestDeviceOptions {
  filters: BluetoothRequestDeviceFilter[];
  optionalServices?: string[];
}

interface Bluetooth {
  getAvailability(): Promise<boolean>;
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface Navigator {
  bluetooth: Bluetooth;
}
