import { Component } from '@angular/core';
import { PrintingService } from '../../Services/printing.service';
import { BluetoothPrinterService } from '../../Services/bluetooth-printer.service';
import { PrinterSettingsService } from '../../Services/printer-settings.service';

@Component({
  selector: 'app-print-test',
  templateUrl: './print-test.component.html',
  styleUrl: './print-test.component.scss',
})
export class PrintTestComponent {
  isPrinting = false;
  printStatus = '';

  constructor(
    private printingService: PrintingService,
    private bluetoothPrinterService: BluetoothPrinterService,
    private printerSettingsService: PrinterSettingsService
  ) {}

  async testPrint() {
    this.isPrinting = true;
    this.printStatus = 'Checking printer settings...';

    try {
      // Get printer settings to determine printer type
      const settings = this.printerSettingsService.getSettings();

      if (!settings) {
        this.printStatus = 'No printer configured. Please configure a printer in settings.';
        return;
      }

      // Handle Bluetooth printer separately
      if (settings.printerType === 'bluetooth') {
        this.printStatus = 'Checking Bluetooth connection...';

        // Check if printer is connected
        const isConnected = this.bluetoothPrinterService.isDeviceConnected();
        if (!isConnected) {
          this.printStatus = 'Bluetooth printer not connected. Attempting to reconnect...';
        }

        this.printStatus = 'Generating test print data...';

        // Use the printer settings service test print for Bluetooth
        await this.printerSettingsService.testPrint();

        this.printStatus = 'Print sent successfully!';
      } else {
        // Handle system/network/USB printers
        this.printStatus = 'Checking printer availability...';

        const available = await this.printingService.checkPrinterAvailability();
        if (!available) {
          this.printStatus = 'No printer available';
          return;
        }

        this.printStatus = 'Generating document...';

        // Get content to print
        const contentToPrint = this.getTestContent();
        const htmlContent = this.printingService.generatePrintHTML(
          contentToPrint,
          'Test Document'
        );

        this.printStatus = 'Sending to printer...';

        // Print the document
        await this.printingService.printHTML(htmlContent, {
          name: 'DasaDove Test Print',
          orientation: 'portrait',
        });

        this.printStatus = 'Print successful!';
      }
    } catch (error: any) {
      console.error('Print failed:', error);
      this.printStatus = `Print failed: ${error.message || error}`;
    } finally {
      this.isPrinting = false;
    }
  }

  private getTestContent(): string {
    return `
      <h2>Test Print Content</h2>
      <p>This is a test document to verify that printing functionality works correctly.</p>
      
      <h3>Features Tested:</h3>
      <ul>
        <li>HTML content printing</li>
        <li>Mobile and web compatibility</li>
        <li>Printer availability detection</li>
        <li>Custom styling and formatting</li>
      </ul>

      <h3>Sample Data:</h3>
      <table border="1" style="width: 100%; border-collapse: collapse;">
        <tr>
          <th style="padding: 8px; background-color: #f2f2f2;">Item</th>
          <th style="padding: 8px; background-color: #f2f2f2;">Quantity</th>
          <th style="padding: 8px; background-color: #f2f2f2;">Price</th>
        </tr>
        <tr>
          <td style="padding: 8px;">Product A</td>
          <td style="padding: 8px;">2</td>
          <td style="padding: 8px;">$10.00</td>
        </tr>
        <tr>
          <td style="padding: 8px;">Product B</td>
          <td style="padding: 8px;">1</td>
          <td style="padding: 8px;">$15.00</td>
        </tr>
      </table>

      <p><strong>Total: $35.00</strong></p>
      
      <p>If you can see this document properly formatted, the printing system is working correctly!</p>
    `;
  }
}
