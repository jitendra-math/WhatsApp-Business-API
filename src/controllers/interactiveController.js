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

        // Build interactive buttons array as per Baileys spec
        const interactiveButtons = buttons.map((btn, idx) => {
            const base = { index: idx };
            if (btn.type === 'copy') {
                if (!btn.code) throw new Error('Copy button requires "code" field');
                return {
                    ...base,
                    name: 'copy',
                    copy_code: btn.code,
                    button_params_json: JSON.stringify({ display_text: btn.text || 'Copy' })
                };
            } else if (btn.type === 'reply') {
                if (!btn.id) throw new Error('Reply button requires "id" field');
                return {
                    ...base,
                    name: 'quick_reply',
                    button_params_json: JSON.stringify({ display_text: btn.text || 'Reply', id: btn.id })
                };
            } else if (btn.type === 'url') {
                if (!btn.url) throw new Error('URL button requires "url" field');
                return {
                    ...base,
                    name: 'cta_url',
                    button_params_json: JSON.stringify({ display_text: btn.text || 'Visit', url: btn.url })
                };
            } else if (btn.type === 'call') {
                if (!btn.phone) throw new Error('Call button requires "phone" field');
                return {
                    ...base,
                    name: 'cta_call',
                    button_params_json: JSON.stringify({ display_text: btn.text || 'Call', phone_number: btn.phone })
                };
            } else {
                throw new Error(`Unsupported button type: ${btn.type}`);
            }
        });

        // Interactive message structure
        const interactiveMessage = {
            interactive: {
                type: 'button',
                header: title ? { type: 'text', text: title } : undefined,
                body: { text: body },
                footer: footer ? { text: footer } : undefined,
                action: {
                    buttons: interactiveButtons
                }
            }
        };

        // Remove undefined fields
        if (!title) delete interactiveMessage.interactive.header;

        // Send message
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