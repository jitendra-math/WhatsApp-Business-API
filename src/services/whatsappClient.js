import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import MessageLog from '../models/MessageLog.js';

let clientInstance = null;
let latestQR = null;
let clientStatus = 'INITIALIZING';

export const initializeWhatsAppClient = async () => {
    try {
        console.log('Starting Baileys WhatsApp Client...');
        
        // Session credentials save karne ka setup
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

        const sock = makeWASocket.default ? makeWASocket.default({
            auth: state,
            printQRInTerminal: true, // Ab Render logs mein bhi QR dikhega
            logger: pino({ level: 'error' }), // Silent hata diya, taaki error dikhe
            browser: ['JSS API', 'Chrome', '1.0.0'],
            syncFullHistory: false // RAM bachane ke liye background sync off
        }) : makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'error' }),
            browser: ['JSS API', 'Chrome', '1.0.0'],
            syncFullHistory: false
        });

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
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                
                console.log('Connection closed. Reconnecting:', shouldReconnect);
                
                if (shouldReconnect) {
                    clientStatus = 'INITIALIZING';
                    setTimeout(initializeWhatsAppClient, 3000); // Auto reconnect
                } else {
                    clientStatus = 'DISCONNECTED';
                    console.log('Logged out! You will need to scan QR again.');
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
