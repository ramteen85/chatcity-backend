import mongoose from 'mongoose';

const connectionSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    socketId: {
      type: String,
      required: true,
    },
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
      },
    ],
  },
  { timestamps: true },
);

const Connection = mongoose.model('Connection', connectionSchema);

export default Connection;
