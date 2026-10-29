export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 400,
        public code: string = 'BAD_REQUEST',
        public errors?: any[]
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(errors: any[]) {
        super('Validation failed', 422, 'VALIDATION_ERROR', errors);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401, 'UNAUTHENTICATED');
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'UNAUTHORIZED');
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Entity not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests, please try again later') {
        super(message, 429, 'TOO_MANY_REQUESTS');
    }
}
