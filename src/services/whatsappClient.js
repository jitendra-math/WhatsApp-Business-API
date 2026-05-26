import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import { puppeteerConfig } from '../config/wwebjsConfig.js';
import MessageLog from '../models/MessageLog.js';

let clientInstance = null;
let latestQR = null;
let clientStatus = 'INITIALIZING';

export const initializeWhatsAppClient = () => {
  // Render RAM limit ke liye wapas LocalAuth par shift
  clientInstance = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig
  });

  clientInstance.on('qr', (qr) => {
    latestQR = qr;
    clientStatus = 'AWAITING_QR';
    console.log('QR Code generated. Fetch it via API.');
  });

  clientInstance.on('ready', () => {
    latestQR = null;
    clientStatus = 'READY';
    console.log('WhatsApp Client is READY!');
  });

  clientInstance.on('authenticated', () => {
    console.log('WhatsApp Client Authenticated!');
  });

  clientInstance.on('auth_failure', (msg) => {
    clientStatus = 'AUTH_FAILED';
    console.error('Authentication Failed:', msg);
  });

  clientInstance.on('disconnected', (reason) => {
    clientStatus = 'DISCONNECTED';
    latestQR = null;
    console.log('WhatsApp Client Disconnected:', reason);
    
    setTimeout(() => {
      clientInstance.initialize();
    }, 5000);
  });

  // NAYA: Incoming Messages catch karke MongoDB mein save karna
  clientInstance.on('message', async (msg) => {
    try {
      await MessageLog.create({
        type: 'incoming',
        number: msg.from.replace('@c.us', ''),
        message: msg.body,
        status: 'received'
      });
      console.log(`Saved incoming message from ${msg.from.replace('@c.us', '')}`);
    } catch (err) {
      console.error('Failed to save incoming message to DB:', err);
    }
  });

  setTimeout(() => {
    clientInstance.initialize();
  }, 3000);
};

export const getClient = () => {
  if (clientStatus === 'READY') {
    return clientInstance;
  }
  return null;
};

export const getLatestQR = () => latestQR;
export const getClientStatus = () => clientStatus;
