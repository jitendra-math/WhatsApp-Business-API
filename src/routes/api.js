import express from 'express';
import { getAuthStatus } from '../controllers/authController.js';
import { sendMessage } from '../controllers/messageController.js';
import { exportMessageLogsCSV } from '../controllers/auditController.js';
import { sendMedia } from '../controllers/mediaController.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { createSchedule, listSchedules, deleteSchedule } from '../controllers/scheduleController.js';
import { sendInteractiveMessage } from '../controllers/interactiveController.js';
// Naye controllers import karo
import { 
    upsertButtonResponse, 
    getButtonResponse, 
    listButtonResponses, 
    deleteButtonResponse 
} from '../controllers/buttonResponseController.js';

const router = express.Router();

// Public route (QR code dikhane ke liye)
router.get('/auth/status', getAuthStatus);

// Protected routes (API key mandatory)
router.post('/message/send', apiKeyAuth, sendMessage);
router.post('/media/send', apiKeyAuth, sendMedia);
router.get('/message/export', apiKeyAuth, exportMessageLogsCSV);

// Scheduled messages routes
router.post('/schedule/create', apiKeyAuth, createSchedule);
router.get('/schedule/list', apiKeyAuth, listSchedules);
router.delete('/schedule/:id', apiKeyAuth, deleteSchedule);

// Interactive messages
router.post('/interactive/send', apiKeyAuth, sendInteractiveMessage);

// ========== NAYE ROUTES: Button Response Manager ==========
router.post('/button-response', apiKeyAuth, upsertButtonResponse);
router.get('/button-response/:buttonId', apiKeyAuth, getButtonResponse);
router.get('/button-responses', apiKeyAuth, listButtonResponses);
router.delete('/button-response/:buttonId', apiKeyAuth, deleteButtonResponse);

export default router;