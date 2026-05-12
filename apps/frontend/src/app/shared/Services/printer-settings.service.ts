import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  PrinterSettings,
  PrinterConnectionStatus,
} from '../interfaces/printer-settings.interface';
import { PrintingService } from './printing.service';
import { BluetoothPrinterService } from './bluetooth-printer.service';

@Injectable({
  providedIn: 'root',
})
export class PrinterSettingsService {
  private readonly STORAGE_KEY = 'printer_settings';
  private settingsSubject = new BehaviorSubject<PrinterSettings | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  private bluetoothDevice: any = null;

  constructor(
    private printingService: PrintingService,
    private bluetoothPrinterService: BluetoothPrinterService
  ) {
    this.loadSettings();
  }

  /**
   * Load printer settings from localStorage
   */
  private loadSettings(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        this.settingsSubject.next(settings);
      } catch (error) {
        console.error('Failed to load printer settings:', error);
      }
    }
  }

  /**
   * Get current printer settings
   */
  getSettings(): PrinterSettings | null {
    return this.settingsSubject.value;
  }

  /**
   * Save printer settings
   */
  saveSettings(settings: PrinterSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.settingsSubject.next(settings);
  }

  /**
   * Clear printer settings
   */
  clearSettings(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.settingsSubject.next(null);
  }

  /**
   * Test printer connection
   */
  async testConnection(
    settings?: PrinterSettings
  ): Promise<PrinterConnectionStatus> {
    const testSettings = settings || this.getSettings();

    if (!testSettings) {
      return {
        connected: false,
        error: 'No printer settings configured',
      };
    }

    try {
      // Check if printer is available
      const available = await this.printingService.checkPrinterAvailability();

      if (!available) {
        return {
          connected: false,
          error: 'No printer detected or available',
        };
      }

      // For network printers, we can try to ping the IP
      if (testSettings.printerType === 'network' && testSettings.printerIp) {
        // Note: Actual network ping requires native code or backend
        // This is a placeholder for the check
        return {
          connected: true,
          printerName: testSettings.printerName || 'Network Printer',
          lastTested: new Date(),
        };
      }

      return {
        connected: true,
        printerName: testSettings.printerName || 'System Printer',
        lastTested: new Date(),
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error?.message || 'Connection test failed',
      };
    }
  }

  /**
   * Print raw data to the printer
   */
  async printData(data: string): Promise<void> {
    const settings = this.getSettings();

    if (!settings) {
      throw new Error('No printer settings configured');
    }

    if (settings.printerType === 'bluetooth') {
      await this.bluetoothPrinterService.print(data);
    } else {
      // For non-Bluetooth printers, convert raw data to HTML
      const htmlContent = `<pre style="font-family: monospace; white-space: pre;">${data}</pre>`;
      await this.printingService.printHTML(htmlContent);
    }
  }

  /**
   * Test print with current settings
   */
  async testPrint(settings?: PrinterSettings): Promise<boolean> {
    const testSettings = settings || this.getSettings();

    if (!testSettings) {
      throw new Error('No printer settings configured');
    }

    const testContent = this.generateTestPrintContent(testSettings);

    try {
      if (testSettings.printerType === 'bluetooth') {
        await this.bluetoothPrinterService.print(testContent);
      } else {
        await this.printingService.printHTML(testContent, {
          name: 'DasaDove-Printer-Test',
          orientation: 'portrait',
          monochrome: testSettings.paperSize !== 'A4',
        });
      }
      return true;
    } catch (error) {
      console.error('Test print failed:', error);
      throw error;
    }
  }

  /**
   * Generate test print content based on paper size
   */
  private generateTestPrintContent(settings: PrinterSettings): string {
    if (settings.printerType === 'bluetooth') {
      // For Bluetooth printers, return ESC/POS commands
      return [
        '\x1B\x40', // Initialize printer
        '\x1B\x61\x01', // Center alignment
        'Test Print\n',
        '============\n',
        'DasaDove POS\n',
        'Printer Test\n',
        new Date().toLocaleString() + '\n',
        '\n\n\n\n\n', // Feed lines
        '\x1B\x69', // Cut paper
      ].join('');
    }

    // For other printers, return HTML content
    const isThermal =
      settings.paperSize === '80mm' || settings.paperSize === '58mm';
    const width =
      settings.paperSize === '58mm'
        ? '54mm'
        : settings.paperSize === '80mm'
        ? '72mm'
        : '100%';

    return `
      <div style="
        font-family: 'Arial', sans-serif;
        margin: 0;
        padding: ${isThermal ? '5px' : '20px'};
        width: ${width};
        font-size: ${isThermal ? '11px' : '14px'};
      ">
        <div style="
          text-align: center;
          margin-bottom: ${isThermal ? '10px' : '20px'};
          border-bottom: 1px ${isThermal ? 'dashed' : 'solid'} #000;
          padding-bottom: ${isThermal ? '8px' : '15px'};
        ">
          <h1 style="
            font-size: ${isThermal ? '16px' : '24px'};
            margin: 0 0 5px 0;
          ">DasaDove POS</h1>
          <p>Printer Test Page</p>
        </div>
        
        <div style="margin: ${isThermal ? '10px' : '20px'} 0;">
          <p><strong>Printer Name:</strong> ${
            settings.printerName || 'Default Printer'
          }</p>
          <p><strong>Printer Type:</strong> ${settings.printerType}</p>
          <p><strong>Paper Size:</strong> ${settings.paperSize}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="
          color: green;
          font-weight: bold;
          text-align: center;
          margin: ${isThermal ? '15px' : '30px'} 0;
          font-size: ${isThermal ? '14px' : '18px'};
        ">
          ✓ Test Print Successful
        </div>
      </div>
    `;
  }
}
