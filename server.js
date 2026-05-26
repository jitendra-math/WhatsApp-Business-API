import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './src/app.js';
import { initializeWhatsAppClient } from './src/services/whatsappClient.js';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("FATAL ERROR: MONGODB_URI is missing in environment variables.");
  process.exit(1);
}

// Pehle MongoDB se connect karo, uske baad baaki cheezein start karo
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully!');
    
    // WhatsApp bot ko background mein start karne ke liye
    initializeWhatsAppClient();

    // Express server ko start karne ke liye
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
