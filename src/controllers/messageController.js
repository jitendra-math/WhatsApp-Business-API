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

    const formattedNumber = `${number}@c.us`;
    
    try {
      // Message bhejne ki koshish
      const response = await client.sendMessage(formattedNumber, message);
      
      // MongoDB mein Success Audit Log save karna
      await MessageLog.create({
        type: 'outgoing',
        number: number,
        message: message,
        status: 'sent',
        whatsappMessageId: response.id.id
      });

      return res.status(200).json({
        success: true,
        message: 'Message sent successfully.',
        data: {
          id: response.id.id,
          timestamp: response.timestamp
        }
      });

    } catch (sendError) {
      // MongoDB mein Failure Audit Log save karna
      await MessageLog.create({
        type: 'outgoing',
        number: number,
        message: message,
        status: 'failed',
        errorReason: sendError.message
      });

      throw sendError; // Upar wale catch block mein bhej do taaki 500 error return ho
    }

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
