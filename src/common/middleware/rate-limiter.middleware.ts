import { rateLimit, ipKeyGenerator, Options as RateLimitOptions } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../config/redis';
import { RATE_LIMIT_CONFIG } from '../../config/env';
import { TooManyRequestsError } from '../errors/AppError';

/**
 * Creates a RedisStore instance if Redis is configured and available;
 * otherwise returns undefined to fall back to express-rate-limit's built-in MemoryStore.
 */
const createStore = (prefix: string) => {
    const client = getRedisClient();
    if (!client) {
        return undefined;
    }

    try {
        return new RedisStore({
            sendCommand: async (...args: string[]) => {
                return (client.call as any)(args[0], ...args.slice(1));
            },
            prefix: `hrms:rl:${prefix}:`,
        });
    } catch (err: any) {
        console.warn(`[RateLimiter] Failed to initialize Redis store for '${prefix}': ${err.message}. Using MemoryStore.`);
        return undefined;
    }
};

/**
 * Standard handler that feeds into the application's global error handler.
 */
const standardErrorHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
    options: RateLimitOptions
) => {
    const message = typeof options.message === 'string'
        ? options.message
        : 'Too many requests. Please try again later.';
    next(new TooManyRequestsError(message));
};

/**
 * Tier 1: Global Shield
 * Applied to all API traffic (/api/v1/*).
 * Protects against basic DoS and abusive scraping.
 */
export const globalLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.global.windowMs,
    limit: RATE_LIMIT_CONFIG.global.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: true,
    store: createStore('global'),
    skip: (req: Request) => req.path === '/health' || req.path === '/api/v1/health',
    handler: standardErrorHandler,
    message: 'Global rate limit exceeded. Please slow down your requests.',
});

/**
 * Tier 2: Auth / Sensitive Endpoints Limiter
 * Applied to login and registration routes.
 * Protects against credential stuffing and brute-force attacks.
 * Uses a compound key of IP + email/identifier if present.
 */
export const authLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.auth.windowMs,
    limit: RATE_LIMIT_CONFIG.auth.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: true,
    store: createStore('auth'),
    validate: {
        keyGeneratorIpFallback: false,
    },
    keyGenerator: (req: Request): string => {
        const clientIp = ipKeyGenerator(req);
        const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
        return email ? `${clientIp}_${email}` : clientIp;
    },
    handler: standardErrorHandler,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

/**
 * Tier 3: Heavy / Resource-Intensive Operations Limiter
 * Applied to operations like payroll runs, batch processing, and PDF payslip generation.
 * Keyed by authenticated user ID (or IP as fallback).
 */
export const heavyOperationLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.heavy.windowMs,
    limit: RATE_LIMIT_CONFIG.heavy.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: true,
    store: createStore('heavy'),
    validate: {
        keyGeneratorIpFallback: false,
    },
    keyGenerator: (req: Request): string => {
        return req.user?.userId || ipKeyGenerator(req);
    },
    handler: standardErrorHandler,
    message: 'Rate limit exceeded for resource-intensive operations. Please wait before retrying.',
});

/**
 * Tier 4: User / Tenant Limiter Factory
 * Dynamic limiter that can be attached to any sensitive business route.
 * Keyed by authenticated user ID.
 */
export const createUserLimiter = (options?: {
    windowMs?: number;
    limit?: number;
    prefix?: string;
    message?: string;
}) => {
    return rateLimit({
        windowMs: options?.windowMs || RATE_LIMIT_CONFIG.standardUser.windowMs,
        limit: options?.limit || RATE_LIMIT_CONFIG.standardUser.limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        passOnStoreError: true,
        store: createStore(options?.prefix || 'user'),
        validate: {
            keyGeneratorIpFallback: false,
        },
        keyGenerator: (req: Request): string => {
            return req.user?.userId || ipKeyGenerator(req);
        },
        handler: standardErrorHandler,
        message: options?.message || 'Request limit exceeded for this user. Please try again shortly.',
    });
};
