import mongoose from 'mongoose';

const messageModel = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
    },
  },
  {
    timestamps: true,
  },
);

const Message = mongoose.model('Message', messageModel);

export default Message;
