export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const REDIS_CONFIG = {
    enabled: process.env.ENABLE_REDIS === 'true' || process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

export const RATE_LIMIT_CONFIG = {
    global: {
        windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || '900000', 10), // 15 mins
        limit: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '300', 10), // 300 requests
    },
    auth: {
        windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10), // 15 mins
        limit: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10), // 10 attempts
    },
    heavy: {
        windowMs: parseInt(process.env.RATE_LIMIT_HEAVY_WINDOW_MS || '60000', 10), // 1 min
        limit: parseInt(process.env.RATE_LIMIT_HEAVY_MAX || '10', 10), // 10 requests
    },
    standardUser: {
        windowMs: parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || '60000', 10), // 1 min
        limit: parseInt(process.env.RATE_LIMIT_USER_MAX || '120', 10), // 120 requests
    },
};
