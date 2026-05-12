import axios from 'axios';
import * as https from 'https';

// Configure axios to handle SSL certificates properly
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: true, // Keep SSL verification enabled for security
    // This helps with certificate chain issues
    secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
  }),
  timeout: 30000, // 30 seconds timeout
});

// Add request interceptor for logging (optional)
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'CERT_HAS_EXPIRED' || error.message?.includes('certificate')) {
      console.error('SSL Certificate Error:', error.message);
      console.error('URL:', error.config?.url);
      // You might want to send alerts here
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
