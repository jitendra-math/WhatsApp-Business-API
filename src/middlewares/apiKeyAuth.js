import ApiKey from '../models/ApiKey.js';

export const apiKeyAuth = async (req, res, next) => {
  try {
    // Request header se API Key nikalna
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key is missing. Please provide x-api-key in headers.'
      });
    }

    // MongoDB mein check karna ki key valid aur active hai ya nahi
    const validKey = await ApiKey.findOne({ key: apiKey, isActive: true });

    if (!validKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API Key.'
      });
    }

    // Agar key sahi hai, toh aage controller ke paas request bhej do
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during API Key validation.'
    });
  }
};
