import asyncHandler from 'express-async-handler';
import Message from '../models/message.js';
import User from '../models/user.js';
import Chat from '../models/chat.js';
import ChatRoom from '../models/chatRoom.js';

export const sendRoomMessage = asyncHandler(async (req, res) => {
  try {
    const sender = req.user._id;
    const { content, roomId } = req.body;

    if (!content || !roomId) {
      console.log('invalid request...');
      return res.sendStatus(400);
    }

    let newMessage = {
      sender,
      content,
      room: roomId,
    };

    let message = await Message.create(newMessage);

    message = await message.populate('sender', 'name pic');
    message = await message.populate('room', '-roomPassword -roomAdminPassword');
    message = await User.populate(message, {
      path: 'room.users',
      select: 'name pic email',
    });
    await ChatRoom.findByIdAndUpdate(req.body.chatId, {
      updatedAt: Date.now(),
    });
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const sendMessage = asyncHandler(async (req, res) => {
  try {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      console.log('invalid request...');
      return res.sendStatus(400);
    }

    let newMessage = {
      sender: req.user._id,
      content,
      chat: chatId,
    };

    let message = await Message.create(newMessage);

    message = await message.populate('sender', 'name pic');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'name pic email',
    });
    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message,
    });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const allMessages = asyncHandler(async (req, res) => {
  try {
    const count = await Message.find({ chat: req.query.chatId }).countDocuments();
    const page = req.query.page || 1;
    const itemsPerChunk = 50;
    const offset = count - itemsPerChunk * page;
    let messages;
    if (offset > 0) {
      messages = await Message.find({ chat: req.query.chatId })
        .skip(offset)
        .limit(itemsPerChunk)
        .populate('sender', 'name pic email')
        .populate('chat');
    } else {
      messages = await Message.find({ chat: req.query.chatId })
        .populate('sender', 'name pic email')
        .populate('chat');
    }

    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const allRoomMessages = asyncHandler(async (req, res) => {
  try {
    const count = await Message.find({ room: req.query.id }).countDocuments();
    const page = req.query.page || 1;
    const itemsPerChunk = 40;
    const offset = count - itemsPerChunk * page;
    let messages;

    if (offset > 0) {
      messages = await Message.find({ room: req.query.id })
        .skip(offset)
        .limit(itemsPerChunk)
        .populate('sender', 'name pic email')
        .populate('room');
    } else {
      messages = await Message.find({ room: req.query.id })
        .populate('sender', 'name pic email')
        .populate('room');
    }

    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});
