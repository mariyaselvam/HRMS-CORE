import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterCompanyInput, LoginInput } from './auth.validator';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    register = async (req: Request, res: Response) => {
        const data: RegisterCompanyInput = req.body;
        const result = await this.authService.registerCompany(data);

        res.status(201).json({
            success: true,
            data: result
        });
    };

    login = async (req: Request, res: Response) => {
        const data: LoginInput = req.body;
        const result = await this.authService.login(data);

        res.json({
            success: true,
            data: result
        });
    };
}
