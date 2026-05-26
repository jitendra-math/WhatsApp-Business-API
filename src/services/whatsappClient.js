import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;
import { MongoStore } from 'wwebjs-mongo';
import mongoose from 'mongoose';
import { puppeteerConfig } from '../config/wwebjsConfig.js';

let clientInstance = null;
let latestQR = null;
let clientStatus = 'INITIALIZING';

export const initializeWhatsAppClient = () => {
  // Mongoose connection ka use karke MongoStore setup karna
  const store = new MongoStore({ mongoose: mongoose });

  clientInstance = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 60000 // Har 1 minute mein session sync karega
    }),
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

  // Yeh naya event confirm karega ki Mongo DB mein session chala gaya hai
  clientInstance.on('remote_session_saved', () => {
    console.log('WhatsApp remote session successfully saved to MongoDB.');
  });

  clientInstance.on('auth_failure', (msg) => {
    clientStatus = 'AUTH_FAILED';
    console.error('Authentication Failed:', msg);
  });

  clientInstance.on('disconnected', (reason) => {
    clientStatus = 'DISCONNECTED';
    latestQR = null;
    console.log('WhatsApp Client Disconnected:', reason);
    
    // Disconnect hone par bhi thoda delay dekar restart karenge
    setTimeout(() => {
      clientInstance.initialize();
    }, 5000);
  });

  // Server boot hone ke baad CPU/RAM ko thoda stabilize hone ka time de rahe hain (3 sec delay)
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
