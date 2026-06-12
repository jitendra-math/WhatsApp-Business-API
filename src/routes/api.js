import express from 'express';
import { getAuthStatus } from '../controllers/authController.js';
import { sendMessage } from '../controllers/messageController.js';
import { exportMessageLogsCSV } from '../controllers/auditController.js';
import { sendMedia } from '../controllers/mediaController.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { createSchedule, listSchedules, deleteSchedule } from '../controllers/scheduleController.js';
import { sendInteractiveMessage } from '../controllers/interactiveController.js';

const router = express.Router();

// Public route (QR code dikhane ke liye)
router.get('/auth/status', getAuthStatus);

// Protected routes (API key mandatory)
router.post('/message/send', apiKeyAuth, sendMessage);
router.post('/media/send', apiKeyAuth, sendMedia);
router.get('/message/export', apiKeyAuth, exportMessageLogsCSV);

// Scheduled messages routes (API key protected)
router.post('/schedule/create', apiKeyAuth, createSchedule);
router.get('/schedule/list', apiKeyAuth, listSchedules);
router.delete('/schedule/:id', apiKeyAuth, deleteSchedule);

// Interactive messages (buttons, copy, call, url) – API key protected
router.post('/interactive/send', apiKeyAuth, sendInteractiveMessage);

export default router;