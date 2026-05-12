import { Injectable } from '@nestjs/common';
import axios from '../../config/axios.config';
import { MpesaAuthService } from '../mpesa-auth.service';
import { mpesaConfig } from 'mpesa.config';
import { MpesaCallbackDto } from './mpesa-callback.dto';
import { MpesaTransactionData } from './mpesaTransactions.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MpesaService {
  constructor(
    private authService: MpesaAuthService,
    private readonly prisma: PrismaService,
  ) {}
  async onModuleInit() {
    // await this.registerC2BUrls();
  }
  private readonly baseUrl =
    mpesaConfig.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  async checkTransaction(transactionId: string): Promise<any> {
    const accessToken = await this.authService.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/transactionstatus/v1/query`,
        {
          Initiator: 'shaphankirui', // Replace with your actual initiator name
          SecurityCredential:
            'b0Oh4jg9J2bHamYU7pVhkP+lCE8YpA7IJhbbDMwGpnh3S0ikFzpssesE+wutnKooQqpeKiSQSK+jw1cbULcPCpNoTYVAwJO2Oj8CeIXVROkBqXX33HBevvFyeh467Flwi18lEeNROUYGp+kMJRl2JSLq9e+y19+6qVUoiYcLVcQ6UDl/LobU85zC9FbKZ6rDyPqibVOqXkgOn0NTwDlfHDRgSROcFoirBaGBtiwoVsIMYv2bv3CdiQQIu9qoMr50viKPDoKiO+nYqYp44mSvokqB6tB87vgXnhgyb6vr92yWcuY0UdX60cBu3wJm821Jp/Zk0L/BAgrhwLAH4ujb+Q==', // This should be an encrypted credential
          CommandID: 'TransactionStatusQuery',
          TransactionID: transactionId,
          PartyA: mpesaConfig.shortcode,
          IdentifierType: '4',
          ResultURL: 'https://your-server.com/api/result', // Your actual result URL
          QueueTimeOutURL: 'https://your-server.com/api/timeout', // Your actual timeout URL
          Remarks: 'Check transaction',
          Occasion: 'Check',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error('Failed to check M-Pesa transaction');
    }
  }
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ): Promise<any> {
    const accessToken = await this.authService.getAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, -3);
    const password = Buffer.from(
      mpesaConfig.shortcode + mpesaConfig.passkey + timestamp,
    ).toString('base64');

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: mpesaConfig.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: mpesaConfig.shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: `${mpesaConfig.callbackUrl}`,
          AccountReference: accountReference,
          TransactionDesc: transactionDesc,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      console.log('STK Push responseddd:', mpesaConfig.callbackUrl);
      return response.data;
    } catch (error) {
      console.error(
        'STK Push error:',
        error.response ? error.response.data : error.message,
      );
      throw new Error('Failed to initiate STK Push');
    }
  }
  async handleSTKPushCallback(callbackData: any) {
    console.log(
      'Received M-Pesa callback:',
      JSON.stringify(callbackData, null, 2),
    );

    // Check if callbackData is empty or undefined
    if (!callbackData || Object.keys(callbackData).length === 0) {
      console.error('Received empty or undefined callback data');
      return { ResultCode: 0, ResultDesc: 'OK' };
    }

    // Check if the expected structure exists
    if (!callbackData.Body || !callbackData.Body.stkCallback) {
      console.error('Callback data does not have the expected structure');
      return { ResultCode: 0, ResultDesc: 'OK' };
    }

    const {
      ResultCode,
      ResultDesc,
      MerchantRequestID,
      CheckoutRequestID,
      CallbackMetadata,
    } = callbackData.Body.stkCallback;

    // Initialize transaction data object
    const transactionData: MpesaTransactionData = {
      merchantRequestID: MerchantRequestID,
      checkoutRequestID: CheckoutRequestID,
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      amount: null,
      mpesaReceiptNumber: null,
      transactionDate: null,
      phoneNumber: null,
    };

    if (ResultCode === 0 && CallbackMetadata) {
      // Extract additional transaction details from CallbackMetadata
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'Amount':
            transactionData.amount = item.Value;
            break;
          case 'MpesaReceiptNumber':
            transactionData.mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionData.transactionDate = new Date(
              `${item.Value.toString().slice(0, 4)}-${item.Value.toString().slice(
                4,
                6,
              )}-${item.Value.toString().slice(
                6,
                8,
              )}T${item.Value.toString().slice(
                8,
                10,
              )}:${item.Value.toString().slice(
                10,
                12,
              )}:${item.Value.toString().slice(12, 14)}`,
            );
            break;
          case 'PhoneNumber':
            transactionData.phoneNumber = item.Value.toString();
            break;
          default:
            break;
        }
      }

      console.log('Extracted transaction data:', transactionData);
    } else {
      console.log(`Failed M-Pesa transaction: ${ResultDesc}`);
    }

    try {
      // Save the transaction data
      const savedTransaction = await this.prisma.mpesaTransaction.create({
        data: transactionData,
      });

      console.log('Transaction saved successfully:', savedTransaction);
    } catch (error) {
      console.error('Error saving transaction data:', error);
    }

    // Always return OK response to M-Pesa
    return { ResultCode: 0, ResultDesc: 'OK' };
  }

  async registerC2BUrls() {
    const accessToken = await this.authService.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/c2b/v1/registerurl`,
        {
          ShortCode: mpesaConfig.shortcode,
          ResponseType: 'Completed',
          ConfirmationURL:
            'https://mapi-callback-saves.vercel.app/mapi/confirmation',
          ValidationURL:
            'https://mapi-callback-saves.vercel.app/mapi/validation',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      console.log('C2B Register URL response:', response.data);
      return response.data;
    } catch (error) {
      console.error(
        'Error registering C2B URLs:',
        error.response ? error.response.data : error.message,
      );
      throw new Error('Failed to register C2B URLs');
    }
  }
}
