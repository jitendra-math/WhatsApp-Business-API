import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@vkazee/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import MessageLog from '../models/MessageLog.js';
import ButtonResponse from '../models/ButtonResponse.js';   // <-- NAYA IMPORT

let clientInstance = null;
let latestQR = null;
let clientStatus = 'INITIALIZING';

export const initializeWhatsAppClient = async () => {
    try {
        console.log('Starting Baileys WhatsApp Client...');
        
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Using WhatsApp Web Version: ${version.join('.')} (isLatest: ${isLatest})`);

        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

        const sockConfig = {
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }), 
            browser: ['Ubuntu', 'Chrome', '110.0.5481.192'], 
            syncFullHistory: false 
        };

        const sock = makeWASocket.default ? makeWASocket.default(sockConfig) : makeWASocket(sockConfig);
        clientInstance = sock;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                latestQR = qr;
                clientStatus = 'AWAITING_QR';
                console.log('QR Code generated successfully!');
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
                console.log('WhatsApp Client is READY!');
            }
        });

        // ======================================================
        // INCOMING MESSAGES + BUTTON CLICKS HANDLER
        // ======================================================
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify') return;
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const senderJid = msg.key.remoteJid;
            const senderNumber = senderJid.split('@')[0];
            const msgContent = msg.message;

            // ---------- 1. Detect Interactive Button Click ----------
            let buttonId = null;
            let responseText = null;

            // Older format (buttonsResponseMessage)
            if (msgContent?.buttonsResponseMessage) {
                buttonId = msgContent.buttonsResponseMessage.selectedButtonId;
                responseText = msgContent.buttonsResponseMessage.selectedDisplayText;
            }
            // Newer format (interactiveResponseMessage with nativeFlow)
            else if (msgContent?.interactiveResponseMessage?.nativeFlowResponseMessage) {
                try {
                    const params = JSON.parse(msgContent.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                    buttonId = params.id;
                    responseText = params.display_text;
                } catch(e) {
                    console.error('Failed to parse native flow params', e);
                }
            }

            // Agar button click hai toh database se response laake bhejo
            if (buttonId) {
                console.log(`🔘 Button click detected: ID = ${buttonId}, From = ${senderNumber}`);

                try {
                    // Database se lookup
                    const flow = await ButtonResponse.findOne({ buttonId });
                    let replyMessage = flow?.responseMessage || "✅ Thank you for your response!";

                    // Send reply
                    await sock.sendMessage(senderJid, { text: replyMessage });
                    console.log(`Auto-reply sent for button ${buttonId}`);
                } catch (err) {
                    console.error(`Error handling button ${buttonId}:`, err);
                    await sock.sendMessage(senderJid, { text: "⚠️ Sorry, something went wrong. Please try again." });
                }
                return; // Button handled, no need to log as normal text
            }

            // ---------- 2. Normal Text Message ----------
            const textMessage = msgContent.conversation || msgContent.extendedTextMessage?.text;
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
                    console.error('Failed to save incoming message:', err);
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

export const getConnectedNumber = () => {
    if (clientStatus !== 'READY' || !clientInstance) {
        return null;
    }
    try {
        const userId = clientInstance.user?.id;
        if (!userId) return null;
        const number = userId.split('@')[0];
        return number;
    } catch (err) {
        console.error('Error getting connected number:', err);
        return null;
    }
};