import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../errors/AppError';

export interface UserPayload {
    userId: string;
    companyId: string;
    role: string;
    workLocationId?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
            activeBranchId?: string;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Token not provided');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as UserPayload;
        req.user = decoded;
        
        // Extract branch context from header
        const branchId = req.headers['x-branch-id'];
        if (branchId && typeof branchId === 'string') {
            req.activeBranchId = branchId;
        } else if (decoded.workLocationId) {
            // Default to user's assigned branch if no header (for branch managers)
            req.activeBranchId = decoded.workLocationId;
        }

        next();
    } catch (err) {
        throw new AuthenticationError('Invalid or expired token');
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {

        if (!req.user) {
            throw new AuthenticationError("User not authenticated");
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        next();
    };
};