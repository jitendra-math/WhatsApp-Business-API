JSS WhatsApp API Server 🚀

A production-ready headless WhatsApp API server built with Node.js, Express, and Baileys library. Send messages, schedule broadcasts, handle interactive buttons, and manage media—all through a simple REST API.

---

✨ Features

· 📨 Send & Receive Messages - Text messages with real-time delivery status
· 🎯 Interactive Buttons - Support for Reply, Copy, URL, and Call buttons
· 🗓️ Scheduled Messages - Schedule messages with daily/weekly recurrence
· 🖼️ Media Support - Send images, videos, and documents via URL
· 🔐 API Key Authentication - Secure your endpoints with revocable API keys
· 📊 Audit Logs - Complete message history with CSV export
· 🔄 Auto-Reconnect - Automatically reconnects if WhatsApp disconnects
· ⚡ Non-Blocking - Background processing for scheduled messages
· 🐳 Docker Ready - Easy deployment with Docker Compose

---

🛠️ Tech Stack

Technology Purpose
Node.js Runtime environment
Express.js REST API framework
MongoDB (Mongoose) Database for logs, schedules, and API keys
@vkazee/baileys WhatsApp Web library for headless connection
node-cron Background job scheduler
Joi Request validation
Pino Structured logging
Docker Containerization

---

🚀 Quick Start

Prerequisites

· Node.js 20+
· MongoDB (local or Atlas)
· npm or yarn

Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/jss-whatsapp-api.git
cd jss-whatsapp-api

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Update .env with your MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/jss-whatsapp

# 5. Start the server
npm start

# For development with auto-reload
npm run dev
```

Docker Setup

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

---

📝 Environment Variables

Create a .env file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/jss-whatsapp
NODE_ENV=development
```

---

🔑 Authentication

All API endpoints (except /api/auth/status) require an API key in the request header:

```
x-api-key: YOUR_API_KEY
```

Creating an API Key

```bash
# Connect to MongoDB and insert a key
use jss-whatsapp
db.apiKeys.insertOne({
  key: "your-secret-key-here",
  name: "My App",
  isActive: true
})
```

---

📡 API Endpoints

Authentication

Method Endpoint Description
GET /api/auth/status Get QR code or connection status

Messaging

Method Endpoint Description
POST /api/message/send Send a text message
POST /api/media/send Send image/video/document
POST /api/interactive/send Send interactive button message
GET /api/message/export Export message logs as CSV

Scheduling

Method Endpoint Description
POST /api/schedule/create Create a scheduled message
GET /api/schedule/list List all pending schedules
DELETE /api/schedule/:id Cancel a scheduled message

Button Management

Method Endpoint Description
POST /api/button-response Create/update button auto-reply
GET /api/button-response/:buttonId Get button response
GET /api/button-responses List all button responses
DELETE /api/button-response/:buttonId Delete button response

---

📦 API Examples

Send a Text Message

```bash
POST /api/message/send
Headers: x-api-key: YOUR_API_KEY

{
  "number": "919876543210",
  "message": "Hello from JSS WhatsApp API!"
}
```

Response:

```json
{
  "success": true,
  "message": "Message sent successfully.",
  "data": {
    "id": "3A7D8F9E0C1B",
    "timestamp": "2026-06-17T09:07:20.595Z"
  }
}
```

Send Interactive Buttons

```bash
POST /api/interactive/send
Headers: x-api-key: YOUR_API_KEY

{
  "number": "919876543210",
  "title": "Order Confirmation",
  "body": "Your order has been confirmed!",
  "footer": "JSS Originals",
  "buttons": [
    { "type": "reply", "text": "✅ Yes", "id": "yes_btn" },
    { "type": "reply", "text": "❌ No", "id": "no_btn" },
    { "type": "url", "text": "🔗 Track Order", "url": "https://example.com/track" }
  ]
}
```

Schedule a Message

```bash
POST /api/schedule/create
Headers: x-api-key: YOUR_API_KEY

{
  "number": "919876543210",
  "message": "Good morning! Don't forget your meeting at 10 AM.",
  "scheduledTime": "2026-06-18T09:00:00.000Z",
  "repeat": "daily"
}
```

---

🏗️ Project Structure

```
jss-whatsapp-api/
├── .env.example              # Environment variables template
├── .eslintrc.json            # ESLint configuration
├── Dockerfile                # Docker image definition
├── docker-compose.yml        # Multi-container setup
├── jest.config.js            # Jest testing configuration
├── package.json              # Dependencies and scripts
├── server.js                 # Application entry point
├── src/
│   ├── app.js                # Express app setup
│   ├── config/               # Configuration files
│   │   └── index.js          # Centralized config
│   ├── constants/            # Application constants
│   │   ├── enums.js          # Enum definitions
│   │   └── messages.js       # Response messages
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── messageController.js
│   │   ├── mediaController.js
│   │   ├── interactiveController.js
│   │   ├── scheduleController.js
│   │   ├── buttonResponseController.js
│   │   └── auditController.js
│   ├── middlewares/          # Express middlewares
│   │   ├── apiKeyAuth.js     # API key validation
│   │   ├── errorHandler.js   # Global error handler
│   │   └── requestLogger.js  # Request logging
│   ├── models/               # Mongoose models
│   │   ├── ApiKey.js         # API key storage
│   │   ├── MessageLog.js     # Message history
│   │   ├── InteractiveLog.js # Interactive message logs
│   │   ├── ScheduledMessage.js # Scheduled messages
│   │   └── ButtonResponse.js # Button auto-replies
│   ├── routes/               # API routes
│   │   └── api.js            # All routes aggregated
│   ├── services/             # Business logic
│   │   ├── whatsappClient.js # Baileys WhatsApp client
│   │   ├── messageService.js # Message sending logic
│   │   └── schedulerService.js # Cron job scheduler
│   ├── utils/                # Utility functions
│   │   ├── apiResponse.js    # Standardized responses
│   │   └── catchAsync.js     # Async error wrapper
│   └── validators/           # Request validation schemas
│       ├── messageValidator.js
│       └── scheduleValidator.js
└── tests/                    # Unit and integration tests
    └── unit/
```

---

🔄 How It Works

Message Flow

1. Incoming Request → Express receives HTTP request
2. Authentication → API key validated against MongoDB
3. Validation → Request body validated with Joi schemas
4. Controller → Extracts data and calls service layer
5. Service → Formats number and calls Baileys client
6. Baileys → Sends message via WhatsApp WebSocket
7. Logging → Success/failure recorded in MessageLog
8. Response → API returns JSON response to client

Incoming Messages & Buttons

1. Baileys WebSocket receives incoming message event
2. whatsappClient.js detects if it's a button click (old/new format)
3. If button click → Looks up ButtonResponse model for auto-reply
4. Sends auto-reply back to the sender
5. If normal text → Saves to MessageLog as incoming message

Scheduled Messages

1. node-cron runs every minute
2. Fetches pending schedules with scheduledTime <= now
3. Processes each schedule one by one
4. Sends message via Baileys
5. Updates status to completed or reschedules for daily/weekly
6. isRunning flag prevents overlapping executions

---

🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- --testPathPattern=unit

# Run integration tests
npm test -- --testPathPattern=integration
```

---

🤝 Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to branch (git push origin feature/amazing-feature)
5. Open a Pull Request

---

📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

🙏 Acknowledgments

· Baileys - The amazing WhatsApp Web library
· JSS Originals - For the agency use case inspiration

---

📞 Support

For questions or support, please contact:

· 📧 Email: contact@jitubanna.com
· 🌐 Website: https://jitubanna.com
· 🐛 Issues: GitHub Issues

---

Built with ❤️ by Jitendra Singh.
