import { getClient } from '../services/whatsappClient.js';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import MessageLog from '../models/MessageLog.js';
import InteractiveLog from '../models/InteractiveLog.js';

export const sendInteractiveMessage = async (req, res) => {
    try {
        const { number, title, body, footer, buttons } = req.body;

        if (!number || !body || !buttons || !Array.isArray(buttons) || buttons.length === 0) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const client = getClient();
        if (!client) return res.status(503).json({ success: false, error: 'Client not ready' });

        const formattedNumber = `${number}@s.whatsapp.net`;

        // Build native flow buttons
        const nativeButtons = [];
        for (const btn of buttons) {
            if (btn.type === 'copy') {
                nativeButtons.push({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Copy',
                        id: btn.id || `copy_${Date.now()}`,
                        copy_code: btn.code
                    })
                });
            } else if (btn.type === 'reply') {
                nativeButtons.push({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Reply',
                        id: btn.id || `reply_${Date.now()}`
                    })
                });
            } else if (btn.type === 'url') {
                nativeButtons.push({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Visit',
                        url: btn.url,
                        merchant_url: btn.url
                    })
                });
            } else if (btn.type === 'call') {
                nativeButtons.push({
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Call',
                        phone_number: btn.phone
                    })
                });
            }
        }

        // Create interactive message with nativeFlowMessage
        const interactiveMsg = proto.Message.InteractiveMessage.create({
            body: { text: body },
            header: title ? { title } : undefined,
            footer: footer ? { text: footer } : undefined,
            nativeFlowMessage: { buttons: nativeButtons }
        });

        // Wrap in viewOnceMessage (critical for rendering)
        const messageContent = {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: interactiveMsg
                }
            }
        };

        // Generate and relay
        const waMessage = generateWAMessageFromContent(formattedNumber, messageContent, {
            userJid: client.user.id
        });
        await client.relayMessage(formattedNumber, waMessage.message, {
            messageId: waMessage.key.id
        });

        // Logging
        await MessageLog.create({
            type: 'outgoing',
            number,
            message: `[INTERACTIVE] ${body}`,
            status: 'sent',
            whatsappMessageId: waMessage.key.id
        });
        await InteractiveLog.create({
            messageId: waMessage.key.id,
            number,
            body,
            buttons,
            title: title || null,
            footer: footer || null,
            status: 'sent'
        });

        return res.status(200).json({
            success: true,
            messageId: waMessage.key.id
        });
    } catch (error) {
        console.error('Interactive error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};