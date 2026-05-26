import QRCode from 'qrcode';
import { getLatestQR, getClientStatus } from '../services/whatsappClient.js';

export const getAuthStatus = async (req, res) => {
  try {
    const status = getClientStatus();

    if (status === 'READY') {
      return res.status(200).json({ 
        success: true, 
        message: 'WhatsApp is already connected and ready.' 
      });
    }

    const qrData = getLatestQR();

    if (!qrData) {
      return res.status(200).json({ 
        success: false, 
        message: 'QR code not generated yet or client is initializing. Please try again in a few seconds.' 
      });
    }

    const qrImageBase64 = await QRCode.toDataURL(qrData);

    return res.status(200).json({
      success: true,
      status: status,
      qr_code_base64: qrImageBase64,
      qr_data: qrData
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
