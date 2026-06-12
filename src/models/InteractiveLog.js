import mongoose from 'mongoose';

const interactiveLogSchema = new mongoose.Schema({
    messageId: {
        type: String,
        default: null
    },
    number: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: null
    },
    body: {
        type: String,
        required: true
    },
    footer: {
        type: String,
        default: null
    },
    buttons: {
        type: [{
            type: { type: String, enum: ['copy', 'reply', 'url', 'call'] },
            text: String,
            code: String,      // for copy
            id: String,        // for reply
            url: String,       // for url
            phone: String      // for call
        }],
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'failed', 'clicked'],
        default: 'sent'
    },
    userResponse: {
        buttonId: String,
        responseText: String,
        respondedAt: Date
    },
    errorReason: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
interactiveLogSchema.index({ number: 1, createdAt: -1 });
interactiveLogSchema.index({ status: 1 });

export default mongoose.model('InteractiveLog', interactiveLogSchema);