const mongoose = require('mongoose');
const billSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String },
  extractedText: { type: String },
  vendor: { type: String },
  billDate: { type: Date },
  amount: { type: Number },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Bill', billSchema);
