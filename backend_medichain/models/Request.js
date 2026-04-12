const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true
  },
  doctorWallet: {
    type: String,
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  recordId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Request', requestSchema);

