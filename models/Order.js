const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderDate: { type: Date, default: Date.now },
  rating: { type: Number, default: 0 }, // Optional: for storing rating later
  completed: { type: Boolean, default: false }, // New field to mark the order as completed

});

module.exports = mongoose.model('Order', orderSchema);
