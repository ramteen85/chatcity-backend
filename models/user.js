import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userModel = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      required: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
    },
    online: {
      type: Boolean,
      default: false,
    },
    picId: {
      type: String,
      trim: true,
      default: 'none',
    },
    pic: {
      type: String,
      trim: true,
      default:
        'https://res.cloudinary.com/ds3tyyeol/image/upload/v1674228094/chatcity/hacker.jpg',
    },
    pic_secure: {
      type: String,
      trim: true,
      default:
        'https://res.cloudinary.com/ds3tyyeol/image/upload/v1674228094/chatcity/hacker.jpg',
    },
  },
  {
    timestamps: true,
  },
);

userModel.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userModel);

export default User;
