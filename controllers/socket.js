import { redisClient } from '../config/redis.js';
import jwt from 'jsonwebtoken';
import Chat from '../models/chat.js';
import Chatroom from '../models/chatRoom.js';
import Connection from '../models/connection.js';
import User from '../models/user.js';

// initial connect
export const initializeUser = async (socket, user, io) => {
  try {
    if (user && user._id) {
      // join user socket room
      socket.join(user._id);

      // check token
      let decodedToken = jwt.verify(user.token, process.env.JWT_SECRET);
      if (!decodedToken) {
        return;
      }

      // find and delete any existing connection
      let connection = await Connection.deleteMany({ userId: user._id });
      // store new connection in database
      connection = await Connection.create({
        userId: user._id,
        token: user.token,
        socketId: socket.id,
        rooms: [],
      });
      await connection.save();

      // notify all persons user is having a conversation with that they are online (not working)

      const chat = await Chat.find({
        users: { $elemMatch: { $eq: user._id } },
      }).populate('users', '-password');

      for (let x = 0; x < chat.length; x++) {
        const id = chat[x]._id;
        for (let y = 0; y < chat[x].users.length; y++) {
          console.log(chat[x].users[y]._id);
          await socket.to(chat[x].users[y]._id.toString()).emit('online', user._id);
        }
      }

      // output
      console.log(`Connected to Own Room: ${user._id} and conversations ...`);
    } else {
      console.log('Could not set up room...');
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

// conversations
export const joinConversation = async (socket, room) => {
  try {
    if (socket) {
      socket.join(room);
      console.log(`Connected to Conversation: ${room} ...`);
    } else {
      console.log(`Could not connect to User Room`);
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

export const startTyping = (socket, user, selectedChat) => {
  try {
    const userTyping = { user, chat: selectedChat };
    socket.to(selectedChat._id).emit('typing', { userTyping });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const stopTyping = (io, room) => {
  try {
    io.to(room).emit('stopTyping');
  } catch (error) {
    throw new Error(error.message);
  }
};

export const newMessage = async (socket, newMessageReceived) => {
  try {
    let chat = newMessageReceived.chat;

    if (!chat.users) {
      return console.log('chat.users not defined');
    }

    for (let x = 0; x < chat.users.length; x++) {
      // check if online
      const connection = Connection.findOne({ userId: chat.users[x]._id });
      if (connection) {
        chat.users[x].online = true;
      }
    }

    chat.users.forEach((user) => {
      if (user._id == newMessageReceived.sender._id) {
        return;
      }
      socket.to(user._id).emit('messageReceived', {
        newMessageReceived,
        chat,
      });
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteConversation = async (io, chatId, userId, userName, receiverId) => {
  try {
    io.to(receiverId).emit('deleteConversation', { chatId, userId, userName });
  } catch (error) {
    throw new Error(error.message);
  }
};

// chatrooms

export const joinChatroom = async (socket, data) => {
  try {
    // connect to chatroom
    await socket.join(data.chatroom._id);

    console.log('test');

    // find socket connection
    let connection = await Connection.findOne({ socketId: socket.id });

    // if there is a connection, add chatroom to room socket array
    if (connection) {
      connection.rooms.push(data.chatroom._id);
      await connection.save();
    }

    // emit join signal
    await socket
      .to(data.chatroom._id)
      .emit('newUser', { user: data.user, chatroom: data.chatroom });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const leaveChatroom = async (socket, id, user) => {
  try {
    // find socket connection
    let connection = await Connection.findOne({ socketId: socket.id });

    // remove chatroom from socket array
    if (connection) {
      connection.rooms = connection.rooms.filter((r) => r._id !== id);
      await connection.save();
    }

    // emit leave signal
    await socket.to(id).emit('exitUser', user);
  } catch (error) {
    throw new Error(error.message);
  }
};

// on disconnect
export const onDisconnect = async (io, socket) => {
  try {
    console.log('disconnecting...');
    // find connection details
    const connection = await Connection.findOne({ socketId: socket.id });
    if (connection) {
      // search all chatrooms and boot user from each of them
      const userId = connection.userId;
      let chatrooms = await Chatroom.find({
        $and: [{ users: { $elemMatch: { $eq: userId } } }],
      });

      if (chatrooms.length > 0) {
        for (let x = 0; x < chatrooms.length; x++) {
          const chatroom = await Chatroom.findOne({ _id: chatrooms[x]._id });
          chatroom.users = chatroom.users.filter((u) => u._id.toString() !== userId);
          await chatroom.save();
          const user = await User.findOne({ _id: userId }).select('-password');
          io.to(chatroom._id.toString()).emit('exitUser', user);
        }
      }

      // notify all persons user is having a conversation with that they went offline

      const chat = await Chat.find({
        users: { $elemMatch: { $eq: userId } },
      }).populate('users', '-password');

      for (let x = 0; x < chat.length; x++) {
        const id = chat[x]._id;
        await io.to(id.toString()).emit('offline', userId);
      }

      // track online users and make user go offline
      await connection.remove();
    }
  } catch (error) {
    throw new Error(error.message);
  }
};
