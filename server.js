import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { connectDB } from './config/db.js';
import userRoutes from './routes/user.js';
import chatRoutes from './routes/chat.js';
import messageRoutes from './routes/message.js';
import { notFound, errorHandler } from './middleware/error.js';
import { Server } from 'socket.io';
import {
  initializeUser,
  joinConversation,
  newMessage,
  startTyping,
  stopTyping,
  joinChatroom,
  leaveChatroom,
  onDisconnect,
  deleteConversation,
} from './controllers/socket.js';
import ChatRoom from './models/chatRoom.js';
import Message from './models/message.js';

// server init, config and db connection
const app = express();
dotenv.config();
connectDB();

// middlewares
app.use(express.json({ limit: '50mb' }));
app.use(
  cors({
    credentials: true,
    allowedHeaders: '*',
    origin: '*',
  }),
);

// file storage
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'temp'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // check this later
  if (
    file.mimetype === 'application/octet-stream' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb({ message: 'Unsupported File Format' }, false);
  }

  cb(null, true);
};

const upload = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 50, // 50mb
  },
});

app.use(upload.any());

// api routes
app.get('/', (req, res) => {
  res.send('API is Running...');
});

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

app.use(notFound);
app.use(errorHandler);

// spin up server
const server = app.listen(process.env.PORT, () => {
  console.log('Server Up!');
  // cron job - check every 15 mins for an empty activated chatroom
  // if empty, delete chatroom and all messages
  cron.schedule('0 */15 * * * *', async () => {
    const chatroom = await ChatRoom.find({
      activated: true,
      'users.0': { $exists: false },
    });

    console.log('cron job start..');

    for (let x = 0; x < chatroom.length; x++) {
      console.log('Deleting chatroom: ' + chatroom[x].roomName + ' and messages...');
      await Message.deleteMany({
        room: chatroom[x]._id,
      });
    }

    await ChatRoom.deleteMany({
      activated: true,
      'users.0': { $exists: false },
    });
    console.log('cron job end...');
  });
});

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: 'http://localhost:3000',
  },
});

io.on('connection', (socket) => {
  // priv messaging

  console.log(socket.id, ' connected...');

  socket.on('go-online', (user) => {
    initializeUser(socket, user, io);
  });

  socket.on('joinChat', (room) => {
    joinConversation(socket, room);
  });

  socket.on('typing', ({ user, selectedChat }) => {
    startTyping(socket, user, selectedChat);
  });

  socket.on('stopTyping', (room) => {
    stopTyping(io, room);
  });

  socket.on('newMessage', ({ newMessageReceived }) => {
    newMessage(socket, newMessageReceived);
  });

  socket.on('deleteConversation', ({ chatId, userId, userName, receiver }) => {
    deleteConversation(io, chatId, userId, userName, receiver._id);
  });

  //chatrooms
  socket.on('joinRoom', (data) => {
    // join chatroom
    joinChatroom(socket, data);
  });

  socket.on('byebye', ({ id, user }) => {
    // relay to other users that user left the chat
    leaveChatroom(socket, id, user);
  });

  socket.on('roomMessage', (newRoomMessage) => {
    let room = newRoomMessage.message.room;
    let msg = newRoomMessage.message;

    socket.to(room._id).emit('gotmsg', { room, msg });
  });

  socket.on('disconnecting', async () => {
    console.log(socket.id, ' disconnected...');
    onDisconnect(io, socket);
  });
});
