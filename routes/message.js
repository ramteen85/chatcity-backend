import express from 'express';
import protect from '../middleware/auth.js';
import {
  sendMessage,
  allMessages,
  sendRoomMessage,
  allRoomMessages,
} from '../controllers/message.js';

const router = express.Router();

// private
router.post('/', protect, sendMessage);
router.get('/', protect, allMessages);

// chatroom
router.post('/room', protect, sendRoomMessage);
router.get('/room', protect, allRoomMessages);

export default router;
