import { getClient } from '../services/whatsappClient.js';
import MessageLog from '../models/MessageLog.js';

export const sendMessage = async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required in the request body.' 
      });
    }

    const client = getClient();

    if (!client) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp client is not ready. Please check authentication status.' 
      });
    }

    // Baileys format ke liye id
    const formattedNumber = `${number}@s.whatsapp.net`;
    
    try {
      // Message bhejne ka naya syntax
      const response = await client.sendMessage(formattedNumber, { text: message });
      
      // MongoDB mein Success Audit Log
      await MessageLog.create({
        type: 'outgoing',
        number: number,
        message: message,
        status: 'sent',
        whatsappMessageId: response?.key?.id || 'unknown'
      });

      return res.status(200).json({
        success: true,
        message: 'Message sent successfully.',
        data: {
          id: response?.key?.id,
          timestamp: response?.messageTimestamp
        }
      });

    } catch (sendError) {
      // MongoDB mein Failure Audit Log
      await MessageLog.create({
        type: 'outgoing',
        number: number,
        message: message,
        status: 'failed',
        errorReason: sendError.message
      });

      throw sendError; 
    }

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
