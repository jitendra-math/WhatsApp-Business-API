import { getClient } from '../services/whatsappClient.js';
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
 *     { type: "copy", text: "Copy OTP", code: "123456" },
 *     { type: "reply", text: "Yes", id: "yes_btn" },
 *     { type: "url", text: "Visit Site", url: "https://example.com" },
 *     { type: "call", text: "Call Support", phone: "+919876543210" }
 *   ]
 * }
 */
export const sendInteractiveMessage = async (req, res) => {
    try {
        const { number, title, body, footer, buttons } = req.body;

        // Validations
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

        // Build interactive buttons for Baileys (correct format for version 6.x)
        const interactiveButtons = [];
        for (const btn of buttons) {
            if (btn.type === 'copy') {
                if (!btn.code) {
                    return res.status(400).json({ success: false, error: 'Copy button requires "code" field' });
                }
                interactiveButtons.push({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Copy',
                        id: btn.code,
                        copy_code: btn.code
                    })
                });
            } 
            else if (btn.type === 'reply') {
                if (!btn.id) {
                    return res.status(400).json({ success: false, error: 'Reply button requires "id" field' });
                }
                interactiveButtons.push({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Reply',
                        id: btn.id
                    })
                });
            }
            else if (btn.type === 'url') {
                if (!btn.url) {
                    return res.status(400).json({ success: false, error: 'URL button requires "url" field' });
                }
                interactiveButtons.push({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Visit',
                        url: btn.url
                    })
                });
            }
            else if (btn.type === 'call') {
                if (!btn.phone) {
                    return res.status(400).json({ success: false, error: 'Call button requires "phone" field' });
                }
                interactiveButtons.push({
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || 'Call',
                        phone_number: btn.phone
                    })
                });
            }
            else {
                return res.status(400).json({ success: false, error: `Unsupported button type: ${btn.type}` });
            }
        }

        // Interactive message structure – according to Baileys docs
        const interactiveMessage = {
            text: body,  // fallback text
            interactive: {
                type: 'button',
                body: { text: body },
                action: {
                    buttons: interactiveButtons
                }
            }
        };

        // Add header if title provided
        if (title) {
            interactiveMessage.interactive.header = { type: 'text', text: title };
        }
        // Add footer if provided
        if (footer) {
            interactiveMessage.interactive.footer = { text: footer };
        }

        // Send the message
        const response = await client.sendMessage(formattedNumber, interactiveMessage);

        // Log to MessageLog
        await MessageLog.create({
            type: 'outgoing',
            number: number,
            message: `[INTERACTIVE] ${body} | Buttons: ${buttons.map(b => b.text).join(', ')}`,
            status: 'sent',
            whatsappMessageId: response?.key?.id || 'unknown'
        });

        // Log to InteractiveLog for detailed tracking
        await InteractiveLog.create({
            messageId: response?.key?.id,
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
                id: response?.key?.id,
                timestamp: response?.messageTimestamp
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