import bcrypt from 'bcryptjs';
import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import Chat from '../models/chat.js';
import Chatroom from '../models/chatRoom.js';
import Message from '../models/message.js';
import Connection from '../models/connection.js';
import { generateToken } from '../config/helpers.js';
import cloudinary from '../config/cloudinary.js';

const DEFAULT_PIC_URL =
  'https://res.cloudinary.com/ds3tyyeol/image/upload/v1674228094/chatcity/hacker.jpg';

// /api/user/terminate
export const deleteAccount = asyncHandler(async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    // server side validation...

    if (!password) {
      res.status(400);
      throw new Error('Please provide your password...');
    }

    // get user
    const user = await User.findOne({ _id: userId });

    // check password
    if (!(await user.matchPassword(password))) {
      res.status(400);
      throw new Error('Invalid Password...');
    }

    // delete all conversations the user is involved in along with messages
    const chats = await Chat.find({
      $and: [{ users: { $elemMatch: { $eq: userId } } }],
    });

    if (chats && chats.length) {
      for (let x = 0; x < chats.length; x++) {
        await Message.deleteMany({ chat: chats[x]._id });
      }
    }

    await Chat.deleteMany({
      $and: [{ users: { $elemMatch: { $eq: userId } } }],
    });

    // remove user from chatrooms
    let chatrooms = await Chatroom.find({
      $and: [{ users: { $elemMatch: { $eq: userId } } }],
    });

    if (chatrooms.length > 0) {
      for (let x = 0; x < chatrooms.length; x++) {
        const chatroom = await Chatroom.findOne({ _id: chatrooms[x]._id });
        chatroom.users = chatroom.users.filter((u) => u._id.toString() !== userId);
        await chatroom.save();
      }
    }

    // remove user from connections
    const connection = await Connection.findOne({ userId: userId });
    await connection.remove();

    // remove user dp from cloudinary (if not default pic)
    let uploadedResponse;

    // check if user has default display pic
    if (user.pic !== DEFAULT_PIC_URL) {
      // if not, delete user image
      uploadedResponse = await cloudinary.v2.uploader.destroy(user.picId);
    }

    // delete user records
    await user.remove();

    // return response
    res.status(200).json({
      message: 'User terminated. Goodbye...',
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// /api/user/edit/password
export const changePassword = asyncHandler(async (req, res, next) => {
  try {
    const { password, oldPassword } = req.body;
    const userId = req.user._id;

    // server side validation...

    if (!oldPassword) {
      res.status(400);
      throw new Error('Please provide your old password...');
    }

    if (!password) {
      res.status(400);
      throw new Error('Please provide a new password...');
    }

    // find user
    const user = await User.findOne({ _id: userId });

    // check old password
    if (user && (await user.matchPassword(oldPassword))) {
      // if old password is correct, hash and save new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;

      await user.save();

      res.status(200).json({
        message: 'Password Reset Successful!',
      });
    } else {
      res.status(400);
      throw new Error('Invalid password...');
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// /api/user/edit/name
export const userNameEdit = asyncHandler(async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;

    // server side validation...

    if (!name) {
      res.status(400);
      throw new Error('Please provide a new name...');
    }

    const user = await User.findOne({ _id: userId });
    user.name = name;
    await user.save();

    res.status(200).json({
      message: 'Name Change Successful!',
      name: name,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// /api/user/edit/pic
export const userPicEdit = asyncHandler(async (req, res, next) => {
  try {
    const { pic } = req.body;
    const userId = req.user._id;
    let uploadedResponse;

    // server side validation...

    if (!pic) {
      res.status(400);
      throw new Error('Please upload a file...');
    }

    // check if user has default pic
    const user = await User.findOne({ _id: userId });

    if (user.pic !== DEFAULT_PIC_URL) {
      // if not, delete user image
      uploadedResponse = await cloudinary.v2.uploader.destroy(user.picId);
    }

    // upload new image
    const fileStr = pic;
    uploadedResponse = await cloudinary.v2.uploader.upload(fileStr, {
      upload_preset: 'chatcity',
    });

    user.pic = uploadedResponse.url;
    user.pic_secure = uploadedResponse.secure_url;
    user.picId = uploadedResponse.public_id;

    await user.save();

    res.status(200).json({
      _id: user._id,
      pic: user.pic,
      pic_secure: user.pic_secure,
      message: 'Upload Successful!',
    });

    // return image data
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// /api/user
export const registerUser = asyncHandler(async (req, res, next) => {
  try {
    const { name, email, password, pic } = req.body;
    let uploadedResponse;

    // server side validation...

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please enter all the fields...');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists...');
    }

    if (pic) {
      // begin uploading image to cloudinary
      const fileStr = pic;
      uploadedResponse = await cloudinary.v2.uploader.upload(fileStr, {
        upload_preset: 'chatcity',
      });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      picId: pic ? uploadedResponse.public_id : 'none',
      pic: pic
        ? uploadedResponse.url
        : 'https://res.cloudinary.com/ds3tyyeol/image/upload/v1674228094/chatcity/hacker.jpg',
      pic_secure: pic
        ? uploadedResponse.secure_url
        : 'https://res.cloudinary.com/ds3tyyeol/image/upload/v1674228094/chatcity/hacker.jpg',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        pic_secure: user.pic_secure,
        token: generateToken(user._id),
        expiresIn: 28800,
        message: 'Registration Successful!',
      });
    } else {
      throw new Error('Failed to register new user...');
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// /api/user/login
export const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        pic_secure: user.pic_secure,
        token: generateToken(user._id),
        expiresIn: 28800,
        // expiresIn: 3000,
        message: 'Login Successful!',
      });
    } else {
      res.status(401);
      throw new Error('Invalid Username / Password');
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// /api/user?search=blah
export const allUsers = asyncHandler(async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    for (let x = 0; x < users.length; x++) {
      // check if user online
      const connection = await Connection.findOne({ userId: users[x]._id.toString() });

      if (connection) {
        users[x].online = true;
      }
    }

    console.log(users[0]);

    res.send(users);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});
