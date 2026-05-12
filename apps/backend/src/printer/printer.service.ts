import * as ThermalPrinter from 'node-thermal-printer';

export class PrinterService {
  printer = new ThermalPrinter.printer({
    type: ThermalPrinter.types.EPSON,
    interface: `tcp://192.168.100.87:9100`, // Assuming the printer is listening on port 9100
  });
  constructor() {}

  onModuleInit() {
    // this.testPrinter();
  }
  A;
  async testPrinter() {
    const isConnected = await this.printer.isPrinterConnected();
    console.log('Printer connected:', isConnected);

    if (isConnected) {
      this.printer.println('Printer is connected!');
      await this.printer.execute();
    } else {
      console.log('Printer not connected');
    }
  }
}
