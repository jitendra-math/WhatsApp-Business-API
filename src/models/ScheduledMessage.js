import mongoose from 'mongoose';

const scheduledMessageSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true,
    index: true  // fast query ke liye
  },
  repeat: {
    type: String,
    enum: [null, 'daily', 'weekly'],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  lastAttempt: {
    type: Date,
    default: null
  },
  errorReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update `updatedAt` on save
scheduledMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('ScheduledMessage', scheduledMessageSchema);