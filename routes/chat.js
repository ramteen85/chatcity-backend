import express from 'express';
import protect from '../middleware/auth.js';
import {
  accessChat,
  fetchChats,
  deleteChat,
  createRoom,
  joinRoom,
  leaveRoom,
  destroyRoom,
} from '../controllers/chat.js';

const router = express.Router();

// conversations

router.get('/', protect, fetchChats);
router.post('/', protect, accessChat);
router.post('/delete', protect, deleteChat);

// chatrooms
router.post('/room/create', protect, createRoom);
router.post('/room/join', protect, joinRoom);
router.post('/room/leave', protect, leaveRoom);
router.post('/room/destroy', protect, destroyRoom);

export default router;
