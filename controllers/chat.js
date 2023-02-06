import Chat from '../models/chat.js';
import Message from '../models/message.js';
import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import ChatRoom from '../models/chatRoom.js';
import Connection from '../models/connection.js';

export const deleteChat = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.body;

    if (!chatId) {
      console.log('Please provide a chat ID...');
      return res.sendStatus(400);
    }

    const user = await User.findOne({ _id: userId });
    let chat = await Chat.findOne({ _id: chatId })
      .populate('users', '-password')
      .populate('deleted', '-password');

    if (!chat) {
      console.log('Chat not found...');
      return res.sendStatus(400);
    }

    // console.log(chat);

    // add user to deleted array
    if (chat.deleted) {
      chat.deleted = chat.deleted.filter((u) => u._id.toString() !== userId);
      chat.deleted.push(user._id);
    } else {
      chat.deleted = [];
      chat.deleted.push(user._id);
    }
    await chat.save();

    // if deleted array = 2 users, delete conversation and all messages
    if (chat.deleted.length === 2) {
      await Message.deleteMany({ chat: chatId });
      await chat.remove();
    }

    res.status(200).send({ message: 'Conversation deleted!' });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const accessChat = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      console.log('ID not sent with request...');
      return res.sendStatus(400);
    }

    let isChat = await Chat.find({
      $and: [
        { users: { $eq: req.user._id } },
        { users: { $eq: userId } },
        { deleted: { $ne: req.user._id } },
        { deleted: { $ne: userId } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'name pic pic_secure email',
    });

    if (isChat.length > 0) {
      for (let x = 0; x < isChat[0].users.length; x++) {
        const connection = await Connection.findOne({
          userId: isChat[0].users[x]._id.toString(),
        });
        if (connection) {
          isChat[0].users[x].online = true;
        } else {
          isChat[0].users[x].online = false;
        }
      }
      res.send(isChat[0]);
    } else {
      const chatData = {
        chatName: 'sender',
        users: [req.user._id, userId],
        deleted: [],
      };

      const createdChat = await Chat.create(chatData);

      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'users',
        '-password',
      );

      const connection = await Connection.findOne({ userId: userId });

      if (connection) {
        FullChat.users[0].online = true;
        FullChat.users[1].online = true;
      }

      res.status(200).send(FullChat);
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const fetchChats = asyncHandler(async (req, res) => {
  try {
    let chats = await Chat.find({
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { deleted: { $ne: req.user._id } },
      ],
      latestMessage: { $ne: null },
    })
      .populate('users', '-password')
      .populate('deleted', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'name pic pic_secure email',
    });

    for (let x = 0; x < chats.length; x++) {
      for (let y = 0; y < chats[x].users.length; y++) {
        // find user online status
        const tempUser = await Connection.findOne({ userId: chats[x].users[y]._id });
        let flag = false;
        tempUser ? (flag = true) : (flag = false);
        // add online status to user
        chats[x].users[y].online = flag;
      }
    }

    res.status(200).send(chats);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// chatrooms

export const createRoom = asyncHandler(async (req, res) => {
  const { roomName, roomPassword, roomGreeting } = req.body;
  try {
    if (!roomName) {
      console.log('ID not sent with request...');
      res.status(400);
      throw new Error('Room Name Needed...');
    }

    if (!roomPassword) {
      console.log('ID not sent with request...');
      res.status(400);
      throw new Error('Room Password Needed...');
    }

    const roomData = {
      roomName,
      roomPassword,
      activated: false,
      roomAdmin: [req.user._id],
      roomAdminPassword: '',
      roomAssistants: [],
      roomAssistantPassword: '',
      roomGreeting: roomGreeting ? roomGreeting : 'Welcome to my private domain!',
      users: [],
      banned: [],
    };

    const createdRoom = await ChatRoom.create(roomData);

    res.status(200).send({
      roomId: createdRoom._id,
      roomPassword: createdRoom.roomPassword,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const leaveRoom = asyncHandler(async (req, res) => {
  try {
    // user leaves room
    const { roomId } = req.body;
    const userToLeave = req.user._id;

    // validation
    if (!roomId) {
      console.log('ID not sent with request...');
      res.status(400);
      throw new Error('Room Id Needed...');
    }

    const foundRoom = await ChatRoom.findOne({ _id: roomId }).populate(
      'users',
      '-password',
    );

    foundRoom.users = foundRoom.users.filter(
      (u) => u._id.toString() !== userToLeave.toString(),
    );

    await foundRoom.save();

    // return room data
    res.status(200).send({
      message: 'left room!',
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const joinRoom = asyncHandler(async (req, res) => {
  try {
    const { roomId, roomPassword } = req.body;
    const userToJoin = req.user._id;
    if (!roomId) {
      console.log('ID not sent with request...');
      res.status(400);
      throw new Error('Room Id Needed...');
    }

    if (!roomPassword) {
      console.log('ID not sent with request...');
      res.status(400);
      throw new Error('Room Password Needed...');
    }

    const foundRoom = await ChatRoom.findOne({ _id: roomId })
      .populate('roomAdmin', '-password')
      .populate('users', '-password');

    //check password
    if (roomPassword !== foundRoom.roomPassword) {
      res.status(401);
      throw new Error('Wrong Password');
    }

    // activate room
    if (!foundRoom.activated) {
      foundRoom.activated = true;
    }

    // add user to room
    foundRoom.users = await foundRoom.users.filter((u) => u._id.toString() != userToJoin);
    foundRoom.users.push(userToJoin);

    // save changes
    await foundRoom.save();

    await foundRoom.populate('users', '-password');
    // return room data
    res.status(200).send(foundRoom);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const destroyRoom = asyncHandler(async (req, res) => {
  try {
    // endpoint to delete a chatroom and all messages (might implement the option later)
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});
