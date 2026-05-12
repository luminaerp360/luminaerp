import { Injectable } from '@nestjs/common';
import axios from '../config/axios.config';
import { mpesaConfig } from 'mpesa.config';

@Injectable()
export class MpesaAuthService {
  private readonly baseUrl =
    mpesaConfig.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  async getAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`,
    ).toString('base64');

    try {
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );
      console.log(
        'Access token from the daraja api',
        response.data.access_token,
      );

      return response.data.access_token;
    } catch (error) {
      throw new Error('Failed to get M-Pesa access token');
    }
  }
}
