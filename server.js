import dotenv from 'dotenv';
import app from './src/app.js';
import { initializeWhatsAppClient } from './src/services/whatsappClient.js';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 3000;

// WhatsApp bot ko background mein start karne ke liye
initializeWhatsAppClient();

// Express server ko start karne ke liye
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
