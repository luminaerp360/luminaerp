import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Printer } from '@awesome-cordova-plugins/printer/ngx';

@Injectable({
  providedIn: 'root',
})
export class PrintingService {
  constructor(private printer: Printer) {}

  async checkPrinterAvailability(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Running on web - browser printing available');
      return true;
    }

    try {
      const available = await this.printer.isAvailable();
      console.log('Mobile printer available:', available);
      return available;
    } catch (error) {
      console.error('Error checking printer availability:', error);
      return false;
    }
  }

  async printHTML(htmlContent: string, options?: any): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Mobile printing
        const available = await this.checkPrinterAvailability();
        if (!available) {
          throw new Error('No printer available on this device');
        }

        const printOptions = {
          name: 'DasaDove Document',
          orientation: 'portrait',
          monochrome: false,
          ...options,
        };

        await this.printer.print(htmlContent, printOptions);
        console.log('Mobile print successful');
      } else {
        // Web browser printing
        this.printOnWeb(htmlContent);
      }
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  private printOnWeb(htmlContent: string): void {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // Close the window after the user dismisses the print dialog
      printWindow.addEventListener('afterprint', () => {
        printWindow.close();
      });

      const doPrint = () => {
        printWindow.print();
      };

      // Wait for all images to finish loading before printing
      const images = Array.from(printWindow.document.images);
      if (images.length === 0) {
        setTimeout(doPrint, 300);
        return;
      }

      let loaded = 0;
      const total = images.length;
      let printed = false;

      const onDone = () => {
        loaded++;
        if (loaded >= total && !printed) {
          printed = true;
          doPrint();
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          onDone();
        } else {
          img.addEventListener('load', onDone);
          img.addEventListener('error', onDone); // don't block on broken images
        }
      });

      // Safety fallback: print after 5 seconds regardless
      setTimeout(() => {
        if (!printed) {
          printed = true;
          doPrint();
        }
      }, 5000);
    } else {
      // Fallback if popup blocked
      alert('Please allow popups for printing functionality');
    }
  }

  generatePrintHTML(
    content: string,
    title: string = 'DasaDove Document',
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            color: #2c3e50;
          }
          .header p {
            margin: 5px 0;
            color: #7f8c8d;
          }
          .content {
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Printed from DasaDove App</p>
        </div>
      </body>
      </html>
    `;
  }
}
