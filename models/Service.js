const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  image: String,
  title: { type: String, required: true },
  price: Number,
  description: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now } // Add this line for creation date
});

module.exports = mongoose.model('Service', serviceSchema);
