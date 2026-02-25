import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const isKnown = err instanceof AppError;
    const status = isKnown ? err.statusCode : 500;
    const code = isKnown ? err.code : 'INTERNAL_ERROR';
    const message = isKnown ? err.message : 'An unexpected error occurred';

    console.error(`[${code}] ${message}`, isKnown ? '' : err.stack);

    res.status(status).json({
        success: false,
        error: {
            code,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
            ...(isKnown && (err as AppError).errors && { errors: (err as AppError).errors }),
        },
    });
};
