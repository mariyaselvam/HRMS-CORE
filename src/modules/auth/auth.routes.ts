import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRegister, validateLogin } from './auth.validator';
import { authLimiter } from '../../common/middleware/rate-limiter.middleware';

const router = Router();
const authController = new AuthController();

// Tier 2: Strict rate limiting on authentication attempts (brute force protection)
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);

export default router;
