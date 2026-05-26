import express from 'express';
import { getAuthStatus } from '../controllers/authController.js';
import { sendMessage } from '../controllers/messageController.js';

const router = express.Router();

router.get('/auth/status', getAuthStatus);
router.post('/message/send', sendMessage);

export default router;
