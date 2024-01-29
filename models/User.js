const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, dropDups: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  rating: { type: Number, default: 0 },
  phoneNumber: { type: String, required: true },
  sentMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  // Add any other fields as needed
});

module.exports = mongoose.model('User', userSchema);
