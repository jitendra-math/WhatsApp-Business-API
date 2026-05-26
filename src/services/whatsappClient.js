import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import { puppeteerConfig } from '../config/wwebjsConfig.js';

let clientInstance = null;
let latestQR = null;
let clientStatus = 'INITIALIZING';

export const initializeWhatsAppClient = () => {
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
    clientInstance.initialize();
  });

  clientInstance.initialize();
};

export const getClient = () => {
  if (clientStatus === 'READY') {
    return clientInstance;
  }
  return null;
};

export const getLatestQR = () => latestQR;

export const getClientStatus = () => clientStatus;
