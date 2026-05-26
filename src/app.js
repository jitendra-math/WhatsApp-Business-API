import express from 'express';
import apiRoutes from './routes/api.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

export default app;
