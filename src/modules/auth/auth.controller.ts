import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterCompanyDto, LoginDto } from './auth.dto';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    register = async (req: Request, res: Response) => {
        const data: RegisterCompanyDto = req.body;
        const result = await this.authService.registerCompany(data);

        res.status(201).json({
            success: true,
            data: result
        });
    };

    login = async (req: Request, res: Response) => {
        const data: LoginDto = req.body;
        const result = await this.authService.login(data);

        res.json({
            success: true,
            data: result
        });
    };
}
