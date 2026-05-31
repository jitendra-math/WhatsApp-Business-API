import express from 'express';
import { getAuthStatus } from '../controllers/authController.js';
import { sendMessage } from '../controllers/messageController.js';
import { exportMessageLogsCSV } from '../controllers/auditController.js';
import { sendMedia } from '../controllers/mediaController.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';

const router = express.Router();

// Public route (QR code dikhane ke liye)
router.get('/auth/status', getAuthStatus);

// Protected routes (API key mandatory)
router.post('/message/send', apiKeyAuth, sendMessage);
router.post('/media/send', apiKeyAuth, sendMedia);
router.get('/message/export', apiKeyAuth, exportMessageLogsCSV);

export default router;