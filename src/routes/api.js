import express from 'express';
import { getAuthStatus } from '../controllers/authController.js';
import { sendMessage } from '../controllers/messageController.js';
import { exportMessageLogsCSV } from '../controllers/auditController.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';

const router = express.Router();

// Public route (Taaki tumhara frontend QR code bina kisi rukawat ke dikha sake)
router.get('/auth/status', getAuthStatus);

// Protected routes (Ab in endpoints par API Key compulsory hai)
router.post('/message/send', apiKeyAuth, sendMessage);
router.get('/message/export', apiKeyAuth, exportMessageLogsCSV);

export default router;
