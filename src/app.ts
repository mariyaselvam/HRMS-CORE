import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import { globalErrorHandler } from './common/middleware/error.handler';
import { globalLimiter } from './common/middleware/rate-limiter.middleware';
import routes from './routes';

const app = express();

// Trust reverse proxy (needed for accurate client IP identification behind ALB / Nginx / Cloudflare)
app.set('trust proxy', 1);

app.use(cors({
    origin: '*',
}));

app.use(express.json());

// Tier 1: Global DDoS / Abuse Shield
app.use(globalLimiter);

// Routes
app.use('/api/v1', routes);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
