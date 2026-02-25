import { Router } from 'express';
import { AuthController } from './auth.controller';


import { validateRegister, validateLogin } from './auth.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

export default router;
