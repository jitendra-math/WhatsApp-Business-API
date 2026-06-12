import { getClient } from '../services/whatsappClient.js';
import { generateWAMessageFromContent, proto } from '@vkazee/baileys';
import MessageLog from '../models/MessageLog.js';
import InteractiveLog from '../models/InteractiveLog.js';

/**
 * Send interactive message with buttons (copy, call, URL, reply)
 * POST /api/interactive/send
 * Body: {
 *   number: "919876543210",
 *   title: "Optional header title",
 *   body: "Main message text",
 *   footer: "Optional footer",
 *   buttons: [
 *     { type: "copy", text: "Copy OTP", code: "123456", id: "copy_btn" },
 *     { type: "reply", text: "Yes", id: "yes_btn" },
 *     { type: "url", text: "Visit Site", url: "https://example.com" },
 *     { type: "call", text: "Call Support", phone: "+919876543210" }
 *   ]
 * }
 */
export const sendInteractiveMessage = async (req, res) => {
    try {
        const { number, title, body, footer, buttons } = req.body;

        if (!number || !body || !buttons || !Array.isArray(buttons) || buttons.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: number, body, and buttons array'
            });
        }

        if (buttons.length > 3) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 3 buttons allowed per interactive message'
            });
        }

        const client = getClient();
        if (!client) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client not ready. Please check auth status.'
            });
        }

        const formattedNumber = `${number}@s.whatsapp.net`;

        // Build native flow buttons
        const nativeButtons = [];
        for (const btn of buttons) {
            if (btn.type === 'copy') {
                if (!btn.code) {
                    return res.status(400).json({ success: false, error: 'Copy button requires "code" field' });
                }
                nativeButtons.push({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Copy',
                        id: btn.id || `copy_${Date.now()}`,
                        copy_code: btn.code
                    })
                });
            } else if (btn.type === 'reply') {
                if (!btn.id) {
                    return res.status(400).json({ success: false, error: 'Reply button requires "id" field' });
                }
                nativeButtons.push({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Reply',
                        id: btn.id
                    })
                });
            } else if (btn.type === 'url') {
                if (!btn.url) {
                    return res.status(400).json({ success: false, error: 'URL button requires "url" field' });
                }
                nativeButtons.push({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Visit',
                        url: btn.url,
                        merchant_url: btn.url
                    })
                });
            } else if (btn.type === 'call') {
                if (!btn.phone) {
                    return res.status(400).json({ success: false, error: 'Call button requires "phone" field' });
                }
                nativeButtons.push({
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Call',
                        phone_number: btn.phone
                    })
                });
            } else {
                return res.status(400).json({ success: false, error: `Unsupported button type: ${btn.type}` });
            }
        }

        // Create interactive message with nativeFlowMessage
        const interactiveMsg = {
            body: { text: body },
            header: title ? { title } : undefined,
            footer: footer ? { text: footer } : undefined,
            nativeFlowMessage: { buttons: nativeButtons }
        };
        if (!title) delete interactiveMsg.header;

        // Wrap in viewOnceMessage with context info (required for rendering)
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

        // Log to MessageLog
        await MessageLog.create({
            type: 'outgoing',
            number: number,
            message: `[INTERACTIVE] ${body} | Buttons: ${buttons.map(b => b.text).join(', ')}`,
            status: 'sent',
            whatsappMessageId: waMessage.key.id
        });

        // Log to InteractiveLog for detailed tracking
        await InteractiveLog.create({
            messageId: waMessage.key.id,
            number: number,
            body: body,
            buttons: buttons,
            title: title || null,
            footer: footer || null,
            status: 'sent'
        });

        return res.status(200).json({
            success: true,
            message: 'Interactive message sent successfully',
            data: {
                id: waMessage.key.id,
                timestamp: Date.now()
            }
        });

    } catch (error) {
        console.error('Interactive message error:', error);
        // Log failure to InteractiveLog if possible
        try {
            await InteractiveLog.create({
                number: req.body?.number,
                body: req.body?.body || 'unknown',
                buttons: req.body?.buttons || [],
                status: 'failed',
                errorReason: error.message
            });
        } catch (logErr) {}
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};