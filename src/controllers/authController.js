import QRCode from 'qrcode';
import { getLatestQR, getClientStatus, getConnectedNumber } from '../services/whatsappClient.js';

// Helper: Phone number mask karne ke liye (e.g., "+91*****4321")
const maskNumber = (fullNumber) => {
    if (!fullNumber) return null;
    const len = fullNumber.length;
    if (len < 6) return fullNumber;
    const last4 = fullNumber.slice(-4);
    // Agar number 91 se start hota hai aur length 12 hai (typical Indian number)
    if (fullNumber.startsWith('91') && len === 12) {
        return `+${fullNumber.slice(0,2)}*****${last4}`;   // +91*****4321
    }
    // Generic mask
    const maskedMiddle = '*****';
    const prefix = fullNumber.slice(0, len - 6);
    return `${prefix}${maskedMiddle}${last4}`;
};

export const getAuthStatus = async (req, res) => {
  try {
    const status = getClientStatus();

    if (status === 'READY') {
      const fullNumber = getConnectedNumber();
      const maskedNumber = maskNumber(fullNumber);
      
      return res.status(200).json({ 
        success: true, 
        message: 'WhatsApp is already connected and ready.',
        status: status,
        connected_number_masked: maskedNumber   // ✅ Naya field – masked number
      });
    }

    const qrData = getLatestQR();

    if (!qrData) {
      return res.status(200).json({ 
        success: false, 
        message: 'QR code not generated yet or client is initializing. Please try again in a few seconds.',
        status: status
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