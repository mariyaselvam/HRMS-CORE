import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { Prisma } from '@prisma/client';

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    let handledError = err;

    // Handle Prisma Specific Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const target = (err.meta?.target as string[]) || [];
            const field = target[0] || 'field';
            handledError = new AppError(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 400, 'ALREADY_EXISTS');
        } else if (err.code === 'P2025') {
            handledError = new AppError('Record not found', 404, 'NOT_FOUND');
        }
    }

    const isKnown = handledError instanceof AppError;
    const status = isKnown ? (handledError as AppError).statusCode : 500;
    const code = isKnown ? (handledError as AppError).code : 'INTERNAL_ERROR';
    const message = isKnown ? handledError.message : 'An unexpected error occurred';

    console.error(`[${code}] ${message}`, isKnown ? '' : handledError.stack);

    res.status(status).json({
        success: false,
        error: {
            code,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: handledError.stack }),
            ...(isKnown && (handledError as AppError).errors && { errors: (handledError as AppError).errors }),
        },
    });
};
