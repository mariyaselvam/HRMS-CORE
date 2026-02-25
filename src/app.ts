import express from 'express';
import cors from 'cors';
import routes from './routes';
import { globalErrorHandler } from './common/middleware/error.handler';

const app = express();

app.use(cors({
    origin: ['http://localhost:4200'],
    credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/v1', routes);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
