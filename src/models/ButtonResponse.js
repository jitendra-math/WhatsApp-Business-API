import mongoose from 'mongoose';

const buttonResponseSchema = new mongoose.Schema({
    buttonId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    responseMessage: {
        type: String,
        required: true
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
buttonResponseSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('ButtonResponse', buttonResponseSchema);