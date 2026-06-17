import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api', apiRoutes);

app.use(errorHandler);

export default app;