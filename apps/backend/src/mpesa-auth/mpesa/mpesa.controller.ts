import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import { MpesaCallbackDto } from './mpesa-callback.dto';
import * as fs from 'fs';
import { Request, Response } from 'express';

@Controller('organizations/:organizationId/mpesa')
export class MpesaController {
  constructor(private readonly mpesaService: MpesaService) {}

  @Get('check/:transactionId')
  async checkTransaction(@Param('transactionId') transactionId: string) {
    return this.mpesaService.checkTransaction(transactionId);
  }

  @Post('stk-push')
  async initiateSTKPush(
    @Body()
    stkPushDto: {
      phoneNumber: string;
      amount: number;
      accountReference: string;
      transactionDesc: string;
    },
  ) {
    const { phoneNumber, amount, accountReference, transactionDesc } =
      stkPushDto;
    return this.mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      accountReference,
      transactionDesc,
    );
  }

  @Post('callback')
  async handleSTKPushCallback(@Body() callbackData: any) {
    try {
      console.log('Callback received:', JSON.stringify(callbackData, null, 2));
      return await this.mpesaService.handleSTKPushCallback(callbackData);
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }

  @Post('minimal-callback')
  async minimalCallback(@Req() req: Request, @Res() res: Response) {
    console.log('sghndbhjdsn bf ');
    const rawBody = await this.getRawBody(req);

    // Log the entire request
    const logData = {
      timestamp: new Date().toISOString(),
      headers: req.headers,
      body: rawBody,
    };

    // Ensure the logs directory exists
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }

    // Append log to file
    fs.appendFileSync(
      'logs/mpesa_callback_log.txt',
      JSON.stringify(logData, null, 2) + '\n\n',
    );

    console.log('Minimal callback received:', rawBody);

    // Respond immediately
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  private getRawBody(req: Request): Promise<string> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        resolve(data);
      });
    });
  }
}
