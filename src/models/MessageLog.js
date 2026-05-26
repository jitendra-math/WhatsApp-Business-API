import mongoose from 'mongoose';

const messageLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  number: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'received'],
    required: true
  },
  errorReason: {
    type: String,
    default: null
  },
  whatsappMessageId: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('MessageLog', messageLogSchema);
