import { getClient } from '../services/whatsappClient.js';

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
    
    const response = await client.sendMessage(formattedNumber, message);

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully.',
      data: {
        id: response.id.id,
        timestamp: response.timestamp
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
