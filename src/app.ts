import cors from 'cors';
import express from 'express';
import { globalErrorHandler } from './common/middleware/error.handler';
import routes from './routes';

const app = express();

app.use(cors({
    origin: '*',
}));

app.use(express.json());

// Routes
app.use('/api/v1', routes);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
