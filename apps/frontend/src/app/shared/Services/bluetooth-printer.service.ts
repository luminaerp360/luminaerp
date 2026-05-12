import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  BluetoothPrinter,
  SavedPrinterConnection,
} from '../interfaces/bluetooth-printer.interface';
import { Capacitor } from '@capacitor/core';
import { BleClient, BleDevice, numbersToDataView } from '@capacitor-community/bluetooth-le';

@Injectable({
  providedIn: 'root',
})
export class BluetoothPrinterService {
  private readonly STORAGE_KEY = 'saved_bluetooth_printer';

  // Common Bluetooth printer service UUIDs
  // Most thermal printers use Serial Port Profile (SPP) or custom services
  private readonly PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private readonly PRINTER_WRITE_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

  private currentDevice: BleDevice | null = null;
  private _isConnected = new BehaviorSubject<boolean>(false);
  public isConnected$ = this._isConnected.asObservable();

  private _connectedPrinter = new BehaviorSubject<BluetoothPrinter | null>(null);
  public connectedPrinter$ = this._connectedPrinter.asObservable();

  private _isScanning = new BehaviorSubject<boolean>(false);
  public isScanning$ = this._isScanning.asObservable();

  constructor() {
    this.initializeBluetooth();
  }

  /**
   * Initialize Bluetooth on app start and check for saved printer
   */
  private async initializeBluetooth(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not a native platform, Bluetooth not available');
      return;
    }

    try {
      // Initialize BLE Client
      await BleClient.initialize();
      console.log('Bluetooth LE initialized successfully');

      // Try to auto-reconnect to saved printer
      const savedPrinter = this.getSavedPrinter();
      if (savedPrinter && savedPrinter.autoConnect) {
        console.log('Attempting to auto-reconnect to saved printer...');
        await this.reconnectToSavedPrinter(savedPrinter);
      }
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error);
    }
  }

  /**
   * Search for available Bluetooth devices (printers)
   */
  async searchPrinters(): Promise<BluetoothPrinter[]> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Bluetooth scanning is only available on mobile devices');
    }

    const discoveredPrinters: BluetoothPrinter[] = [];

    try {
      this._isScanning.next(true);

      // Request location permission (required for Bluetooth scanning)
      await BleClient.initialize();

      console.log('Starting Bluetooth scan...');

      // Scan for devices for 10 seconds
      await BleClient.requestLEScan(
        {
          // We scan for all devices since printer service UUIDs vary
          allowDuplicates: false,
        },
        (result) => {
          console.log('Discovered device:', result);

          // Filter for likely printer devices
          const deviceName = result.device.name || result.localName || 'Unknown Device';

          // Common printer name patterns
          const isPrinterLikely =
            deviceName.toLowerCase().includes('printer') ||
            deviceName.toLowerCase().includes('print') ||
            deviceName.toLowerCase().includes('rpp') || // Receipt printer
            deviceName.toLowerCase().includes('pos') ||
            deviceName.toLowerCase().includes('thermal') ||
            deviceName.toLowerCase().includes('bt') ||
            deviceName.toLowerCase().includes('bluetooth');

          if (result.device.deviceId && (isPrinterLikely || !result.device.name)) {
            const printer: BluetoothPrinter = {
              id: result.device.deviceId,
              name: deviceName,
              address: result.device.deviceId,
              isConnected: false,
              isPaired: false,
              rssi: result.rssi,
            };

            // Avoid duplicates
            if (!discoveredPrinters.find((p) => p.id === printer.id)) {
              discoveredPrinters.push(printer);
            }
          }
        }
      );

      // Stop scanning after 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await BleClient.stopLEScan();

      console.log(`Scan complete. Found ${discoveredPrinters.length} potential printers`);

      this._isScanning.next(false);
      return discoveredPrinters;
    } catch (error: any) {
      this._isScanning.next(false);
      console.error('Error searching for Bluetooth printers:', error);
      throw new Error(error.message || 'Failed to search for Bluetooth printers');
    }
  }

  /**
   * Connect to a Bluetooth printer
   */
  async connect(printer: BluetoothPrinter): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Bluetooth connection is only available on mobile devices');
    }

    try {
      console.log('Connecting to printer:', printer.name);

      // Connect to the device
      await BleClient.connect(
        printer.id,
        (deviceId) => {
          console.log('Disconnected from device:', deviceId);
          this.handleDisconnection();
        }
      );

      console.log('Connected to:', printer.name);

      // Store the connected device
      this.currentDevice = {
        deviceId: printer.id,
        name: printer.name,
      };

      printer.isConnected = true;
      this._isConnected.next(true);
      this._connectedPrinter.next(printer);

      // Save printer connection to storage
      this.savePrinterConnection({
        deviceId: printer.id,
        deviceName: printer.name,
        deviceAddress: printer.address || printer.id,
        connectedAt: new Date(),
        autoConnect: true,
      });

      console.log('Printer connection saved');
    } catch (error: any) {
      console.error('Error connecting to printer:', error);
      throw new Error(error.message || 'Failed to connect to printer');
    }
  }

  /**
   * Disconnect from the current printer
   */
  async disconnect(): Promise<void> {
    if (!this.currentDevice) {
      return;
    }

    try {
      await BleClient.disconnect(this.currentDevice.deviceId);
      this.handleDisconnection();
    } catch (error: any) {
      console.error('Error disconnecting from printer:', error);
      throw new Error(error.message || 'Failed to disconnect from printer');
    }
  }

  /**
   * Handle disconnection cleanup
   */
  private handleDisconnection(): void {
    this.currentDevice = null;
    this._isConnected.next(false);
    this._connectedPrinter.next(null);
  }

  /**
   * Attempt to reconnect if printer is saved but not currently connected
   */
  private async ensureConnection(): Promise<void> {
    // If already connected, return
    if (this.currentDevice && this._isConnected.getValue()) {
      return;
    }

    // Try to reconnect to saved printer
    const savedPrinter = this.getSavedPrinter();
    if (savedPrinter && savedPrinter.autoConnect) {
      console.log('Printer not connected. Attempting auto-reconnect...');
      await this.reconnectToSavedPrinter(savedPrinter);

      if (!this._isConnected.getValue()) {
        throw new Error('Failed to reconnect to saved printer. Please connect manually.');
      }
    } else {
      throw new Error('No printer connected');
    }
  }

  /**
   * Print data to the connected printer using ESC/POS commands
   */
  async print(data: string): Promise<void> {
    // Ensure we have a connection before printing
    await this.ensureConnection();

    if (!this.currentDevice) {
      throw new Error('No printer connected');
    }

    // Verify the device is still connected via BLE
    try {
      const isStillConnected = await BleClient.isEnabled();
      if (!isStillConnected) {
        throw new Error('Bluetooth is disabled');
      }

      // Additional check: verify device is actually connected
      console.log('Verifying device connection...');
      const services = await BleClient.getServices(this.currentDevice.deviceId);
      console.log(`Device has ${services.length} services available`);
    } catch (error: any) {
      console.error('Bluetooth connection check failed:', error);
      this.handleDisconnection();
      throw new Error('Printer connection lost. Please reconnect the printer.');
    }

    try {
      console.log('Attempting to print to:', this.currentDevice.name);
      console.log('Print data length:', data.length, 'bytes');

      // Convert string data to byte array for ESC/POS commands
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);

      // Get available services
      const services = await BleClient.getServices(this.currentDevice.deviceId);
      console.log('Available services:', services.length);

      // Try to find a writable characteristic
      let writeCharacteristic: any = null;
      let writeService: any = null;

      // Common printer service UUIDs to try
      const commonPrinterServices = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip transparent service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic UART
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Another Nordic UART
      ];

      // First, try to find services that match common printer UUIDs
      for (const service of services) {
        console.log('Checking service:', service.uuid);

        for (const characteristic of service.characteristics) {
          console.log('  Characteristic:', characteristic.uuid, 'Properties:', characteristic.properties);

          // Look for write or writeWithoutResponse properties
          if (
            characteristic.properties.write ||
            characteristic.properties.writeWithoutResponse
          ) {
            writeCharacteristic = characteristic;
            writeService = service;
            console.log('✓ Found writable characteristic:', characteristic.uuid);
            break;
          }
        }
        if (writeCharacteristic) break;
      }

      if (!writeCharacteristic || !writeService) {
        const errorMsg = `No writable characteristic found. Device has ${services.length} services. Please ensure your printer supports BLE printing.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`Using service: ${writeService.uuid}`);
      console.log(`Using characteristic: ${writeCharacteristic.uuid}`);
      console.log(`Write mode: ${writeCharacteristic.properties.write ? 'write' : 'writeWithoutResponse'}`);

      // Write data to the printer
      // Use smaller chunks for better compatibility (most printers support 20 bytes MTU)
      const MTU_SIZE = 20;
      const totalChunks = Math.ceil(dataBytes.length / MTU_SIZE);

      console.log(`Sending ${dataBytes.length} bytes in ${totalChunks} chunks`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * MTU_SIZE;
        const end = Math.min(start + MTU_SIZE, dataBytes.length);
        const chunk = dataBytes.slice(start, end);
        const chunkDataView = numbersToDataView(Array.from(chunk));

        try {
          if (writeCharacteristic.properties.writeWithoutResponse) {
            await BleClient.writeWithoutResponse(
              this.currentDevice.deviceId,
              writeService.uuid,
              writeCharacteristic.uuid,
              chunkDataView
            );
          } else {
            await BleClient.write(
              this.currentDevice.deviceId,
              writeService.uuid,
              writeCharacteristic.uuid,
              chunkDataView
            );
          }

          console.log(`✓ Chunk ${i + 1}/${totalChunks} sent (${chunk.length} bytes)`);

          // Delay between chunks to prevent buffer overflow
          if (i < totalChunks - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (chunkError: any) {
          console.error(`Failed to send chunk ${i + 1}:`, chunkError);
          throw new Error(`Failed to send data to printer at chunk ${i + 1}: ${chunkError.message}`);
        }
      }

      // Wait a bit for printer to process
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✓ Print data sent successfully - All', totalChunks, 'chunks delivered');
    } catch (error: any) {
      console.error('Error printing:', error);
      throw new Error(error.message || 'Failed to print');
    }
  }

  /**
   * Check if a printer is currently connected
   */
  isDeviceConnected(): boolean {
    return this._isConnected.getValue();
  }

  /**
   * Get the currently connected device
   */
  getCurrentDevice(): BluetoothPrinter | null {
    return this._connectedPrinter.getValue();
  }

  /**
   * Save printer connection to localStorage
   */
  private savePrinterConnection(connection: SavedPrinterConnection): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(connection));
  }

  /**
   * Get saved printer connection from localStorage
   */
  getSavedPrinter(): SavedPrinterConnection | null {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse saved printer:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Clear saved printer connection
   */
  clearSavedPrinter(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Reconnect to a saved printer
   */
  private async reconnectToSavedPrinter(
    savedPrinter: SavedPrinterConnection
  ): Promise<void> {
    try {
      const printer: BluetoothPrinter = {
        id: savedPrinter.deviceId,
        name: savedPrinter.deviceName,
        address: savedPrinter.deviceAddress,
        isConnected: false,
      };

      await this.connect(printer);
      console.log('Auto-reconnected to saved printer');
    } catch (error) {
      console.error('Failed to auto-reconnect to saved printer:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  async requestPermissions(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await BleClient.initialize();
      console.log('Bluetooth permissions granted');
    } catch (error) {
      console.error('Bluetooth permissions denied:', error);
      throw new Error('Bluetooth permissions are required to connect to printers');
    }
  }
}
