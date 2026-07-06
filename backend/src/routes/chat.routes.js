import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getRooms, getMessages, sendMessage, aiConsult } from '../controllers/chat.controller.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.get('/rooms', getRooms);
router.get('/rooms/:roomId/messages', getMessages);
router.post('/messages', sendMessage);
router.post('/ai', aiConsult);

export default router;
