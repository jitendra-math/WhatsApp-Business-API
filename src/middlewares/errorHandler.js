import config from '../config/index.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  const response = {
    success: false,
    error: message,
  };

  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  console.error(`[ERROR] ${req.method} ${req.url} - ${statusCode} - ${message}`);

  res.status(statusCode).json(response);
};

export default errorHandler;