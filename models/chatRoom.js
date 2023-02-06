import mongoose from 'mongoose';

// private rooms

const chatRoomModel = mongoose.Schema(
  {
    roomName: {
      type: String,
      trim: true,
      required: true,
    },
    activated: {
      type: Boolean,
      default: false,
    },
    roomPassword: {
      type: String,
      trim: true,
      required: true,
    },
    roomAdmin: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    roomAdminPassword: {
      type: String,
      trim: true,
    },
    roomAssistants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    roomAssistantPassword: {
      type: String,
      trim: true,
    },
    roomGreeting: {
      type: String,
      trim: true,
      default: 'Welcome to my private domain!',
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    banned: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  },
);

const ChatRoom = mongoose.model('ChatRoom', chatRoomModel);

export default ChatRoom;

// upcoming props
// isPrivate ()
// moderators
// moderator password
// country
// state
// town
// category
// subcategories
