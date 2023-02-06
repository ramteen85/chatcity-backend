import express from 'express';
import {
  registerUser,
  loginUser,
  allUsers,
  userPicEdit,
  userNameEdit,
  changePassword,
  deleteAccount,
} from '../controllers/user.js';
import protect from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
const router = express.Router();

router.get('/', rateLimiter(60, 15), protect, allUsers);

router.post('/', rateLimiter(30, 5), registerUser);
router.post('/login', loginUser); // 60, 5
router.post('/edit/pic', protect, userPicEdit);
router.post('/edit/name', protect, userNameEdit);
router.post('/edit/password', protect, changePassword);
router.post('/terminate', protect, deleteAccount);

export default router;
