import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export const validateRequest = (schema: ZodSchema, source: 'body' | 'query' = 'body') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dataToValidate = source === 'query' ? req.query : req.body;
            const parsedData = await schema.parseAsync(dataToValidate);

            if (source === 'query') {
                req.query = parsedData as any;
            } else {
                req.body = parsedData;
            }

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
