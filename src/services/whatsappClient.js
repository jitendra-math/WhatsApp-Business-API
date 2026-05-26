import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import MessageLog from '../models/MessageLog.js';

let clientInstance = null;
let latestQR = null;
let clientStatus = 'INITIALIZING';

export const initializeWhatsAppClient = async () => {
    try {
        console.log('Starting Baileys WhatsApp Client...');
        
        // NAYA CODE: WhatsApp ka latest version fetch karna taaki 405 error na aaye
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Using WhatsApp Web Version: ${version.join('.')} (isLatest: ${isLatest})`);

        // Session credentials save karne ka setup
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

        const sockConfig = {
            version, // Version ko yahan pass kiya hai
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }), 
            browser: ['Ubuntu', 'Chrome', '110.0.5481.192'], 
            syncFullHistory: false 
        };

        const sock = makeWASocket.default ? makeWASocket.default(sockConfig) : makeWASocket(sockConfig);
        clientInstance = sock;

        // Credentials update hone par save karna
        sock.ev.on('creds.update', saveCreds);

        // Connection aur QR state manage karna
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                latestQR = qr;
                clientStatus = 'AWAITING_QR';
                console.log('QR Code generated successfully! Fetch it via API.');
            }

            if (connection === 'close') {
                latestQR = null;
                const error = lastDisconnect?.error;
                const statusCode = (error instanceof Boom) ? error.output?.statusCode : 500;
                
                console.log(`Connection closed! Reason Code: ${statusCode}`);
                
                if (statusCode === DisconnectReason.loggedOut) {
                    clientStatus = 'DISCONNECTED';
                    console.log('Logged out! You will need to scan QR again.');
                } else {
                    clientStatus = 'INITIALIZING';
                    console.log('Reconnecting in 5 seconds...');
                    setTimeout(initializeWhatsAppClient, 5000);
                }
            } else if (connection === 'open') {
                latestQR = null;
                clientStatus = 'READY';
                console.log('WhatsApp Client is READY! Connected to WebSockets.');
            }
        });

        // Incoming messages catch karke MongoDB mein save karna
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify') return;
            const msg = m.messages[0];
            
            // Khud ka bheja hua message ignore karo
            if (!msg.message || msg.key.fromMe) return;

            const senderNumber = msg.key.remoteJid.split('@')[0];
            const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

            if (textMessage) {
                try {
                    await MessageLog.create({
                        type: 'incoming',
                        number: senderNumber,
                        message: textMessage,
                        status: 'received'
                    });
                    console.log(`Saved incoming message from ${senderNumber}`);
                } catch (err) {
                    console.error('Failed to save incoming message to DB:', err);
                }
            }
        });

    } catch (error) {
        console.error('CRITICAL ERROR: Failed to start Baileys:', error);
        clientStatus = 'FAILED';
    }
};

export const getClient = () => {
    if (clientStatus === 'READY') {
        return clientInstance;
    }
    return null;
};

export const getLatestQR = () => latestQR;
export const getClientStatus = () => clientStatus;
