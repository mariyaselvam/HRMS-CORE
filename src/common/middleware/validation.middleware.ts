import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export const validateRequest = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsedData = await schema.parseAsync(req.body);
            req.body = parsedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                return next(new ValidationError(formattedErrors));
            }
            next(error);
        }
    };
};
