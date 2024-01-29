// Assuming you have a file for your message schema, for example, message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
