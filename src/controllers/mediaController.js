import { getClient } from '../services/whatsappClient.js';
import MessageLog from '../models/MessageLog.js';
import axios from 'axios';
import path from 'path';

// Maximum file sizes (in bytes)
const MAX_IMAGE_VIDEO = 16 * 1024 * 1024;   // 16 MB
const MAX_DOCUMENT = 100 * 1024 * 1024;      // 100 MB

export const sendMedia = async (req, res) => {
    try {
        const { number, mediaUrl, caption, mediaType } = req.body;

        // Validation
        if (!number || !mediaUrl || !mediaType) {
            return res.status(400).json({
                success: false,
                error: 'number, mediaUrl, and mediaType are required'
            });
        }

        const validTypes = ['image', 'video', 'document'];
        if (!validTypes.includes(mediaType)) {
            return res.status(400).json({
                success: false,
                error: 'mediaType must be image, video, or document'
            });
        }

        // WhatsApp client ready check
        const client = getClient();
        if (!client) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready. Check auth status.'
            });
        }

        // Format number
        const formattedNumber = `${number}@s.whatsapp.net`;

        // --- Download media from URL ---
        let mediaBuffer;
        let fileSize = 0;
        let mimeType = '';
        let fileName = '';

        try {
            // Send HEAD request first to check file size and type (optional)
            const headResponse = await axios.head(mediaUrl);
            fileSize = parseInt(headResponse.headers['content-length'] || '0');
            mimeType = headResponse.headers['content-type'] || '';

            // Size limit check
            if (mediaType === 'image' || mediaType === 'video') {
                if (fileSize > MAX_IMAGE_VIDEO) {
                    return res.status(400).json({
                        success: false,
                        error: `${mediaType} file too large. Max 16MB.`
                    });
                }
            } else if (mediaType === 'document') {
                if (fileSize > MAX_DOCUMENT) {
                    return res.status(400).json({
                        success: false,
                        error: 'Document file too large. Max 100MB.'
                    });
                }
            }

            // Download actual file
            const response = await axios({
                method: 'get',
                url: mediaUrl,
                responseType: 'arraybuffer',
                timeout: 30000 // 30 seconds
            });
            mediaBuffer = Buffer.from(response.data);
            mimeType = response.headers['content-type'] || mimeType;

            // Extract filename from URL or create one
            let urlPath = new URL(mediaUrl).pathname;
            fileName = path.basename(urlPath) || `file_${Date.now()}`;
            if (!fileName.includes('.')) {
                // Add extension based on mime type if missing
                const ext = mimeType.split('/')[1];
                if (ext) fileName += `.${ext}`;
            }
        } catch (downloadError) {
            console.error('Media download failed:', downloadError.message);
            return res.status(400).json({
                success: false,
                error: `Failed to download media from URL: ${downloadError.message}`
            });
        }

        // --- Prepare message object for Baileys ---
        let messageContent = {};
        switch (mediaType) {
            case 'image':
                messageContent = { image: mediaBuffer, caption: caption || '' };
                break;
            case 'video':
                messageContent = { video: mediaBuffer, caption: caption || '' };
                break;
            case 'document':
                messageContent = {
                    document: mediaBuffer,
                    mimetype: mimeType || 'application/octet-stream',
                    fileName: fileName,
                    caption: caption || '' // caption works for documents too
                };
                break;
        }

        // --- Send message ---
        try {
            const response = await client.sendMessage(formattedNumber, messageContent);

            // Log success in MongoDB
            await MessageLog.create({
                type: 'outgoing',
                number: number,
                message: `[${mediaType}] ${caption || 'no caption'} - URL: ${mediaUrl.substring(0, 100)}`,
                status: 'sent',
                whatsappMessageId: response?.key?.id || 'unknown'
            });

            return res.status(200).json({
                success: true,
                message: `${mediaType} sent successfully`,
                data: {
                    id: response?.key?.id,
                    timestamp: response?.messageTimestamp
                }
            });
        } catch (sendError) {
            // Log failure
            await MessageLog.create({
                type: 'outgoing',
                number: number,
                message: `[${mediaType}] FAILED - ${mediaUrl}`,
                status: 'failed',
                errorReason: sendError.message
            });

            return res.status(500).json({
                success: false,
                error: `WhatsApp send failed: ${sendError.message}`
            });
        }
    } catch (error) {
        console.error('Media controller error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};