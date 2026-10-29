import Redis from 'ioredis';
import { REDIS_CONFIG } from './env';

let redisClient: Redis | null = null;
let isConnected = false;

export const initRedis = (): Redis | null => {
    if (!REDIS_CONFIG.enabled) {
        console.log('[Redis] Disabled via config. Rate limiting using in-memory store.');
        return null;
    }

    if (redisClient) {
        return redisClient;
    }

    try {
        redisClient = new Redis({
            host: REDIS_CONFIG.host,
            port: REDIS_CONFIG.port,
            password: REDIS_CONFIG.password,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy(times) {
                if (times > 3) {
                    console.warn('[Redis] Max reconnection attempts reached. Continuing with in-memory fallback.');
                    return null;
                }
                return Math.min(times * 1000, 3000);
            },
        });

        redisClient.on('connect', () => {
            isConnected = true;
            console.log('[Redis] Connected successfully.');
        });

        redisClient.on('error', (err) => {
            isConnected = false;
            console.warn(`[Redis] Connection warning: ${err.message}. Rate limiter will use in-memory store.`);
        });

        redisClient.on('close', () => {
            isConnected = false;
        });

        // Attempt initial connection asynchronously without blocking server startup
        redisClient.connect().catch((err) => {
            isConnected = false;
            console.warn(`[Redis] Failed initial connection to ${REDIS_CONFIG.host}:${REDIS_CONFIG.port} (${err.message}). Defaulting to in-memory store.`);
        });

        return redisClient;
    } catch (err: any) {
        console.warn(`[Redis] Initialization error: ${err.message}. Defaulting to in-memory store.`);
        redisClient = null;
        return null;
    }
};

export const getRedisClient = (): Redis | null => {
    if (!redisClient && REDIS_CONFIG.enabled) {
        return initRedis();
    }
    return redisClient;
};

export const isRedisReady = (): boolean => isConnected;
