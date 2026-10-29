jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            setContent: jest.fn(),
            pdf: jest.fn().mockResolvedValue(Buffer.from('dummy-pdf')),
            close: jest.fn(),
        }),
        close: jest.fn(),
    }),
}));

import request from 'supertest';
import express from 'express';
import { globalErrorHandler } from '../../src/common/middleware/error.handler';
import { createUserLimiter } from '../../src/common/middleware/rate-limiter.middleware';
import app from '../../src/app';

describe('Rate Limiter Middleware', () => {
    describe('Global & Integration Behavior', () => {
        it('should bypass the rate limiter for health check endpoint', async () => {
            const res = await request(app).get('/api/v1/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'ok' });
        });

        it('should include draft-8 RateLimit headers on regular endpoints', async () => {
            const nonHealthRes = await request(app).get('/api/v1/non-existent-probe');
            
            // RateLimit headers should exist (RateLimit-Limit or ratelimit-policy / ratelimit)
            const headers = nonHealthRes.headers;
            const hasRateLimitHeader = Boolean(
                headers['ratelimit-limit'] || 
                headers['ratelimit'] || 
                headers['ratelimit-policy']
            );
            expect(hasRateLimitHeader).toBe(true);
        });
    });

    describe('Rate Limit Exceeded Behavior', () => {
        let testApp: express.Application;

        beforeAll(() => {
            testApp = express();
            testApp.use(express.json());

            const testLimiter = createUserLimiter({
                limit: 3,
                windowMs: 60 * 1000,
                prefix: 'test-limiter',
                message: 'Custom rate limit exceeded for testing',
            });

            testApp.get('/test-route', testLimiter, (req, res) => {
                res.status(200).json({ message: 'success' });
            });

            testApp.use(globalErrorHandler);
        });

        it('should allow requests within the configured threshold', async () => {
            for (let i = 0; i < 3; i++) {
                const res = await request(testApp).get('/test-route');
                expect(res.status).toBe(200);
                expect(res.body.message).toBe('success');
            }
        });

        it('should reject requests exceeding the limit with 429 TOO_MANY_REQUESTS', async () => {
            const res = await request(testApp).get('/test-route');
            expect(res.status).toBe(429);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
            expect(res.body.error.message).toContain('Custom rate limit exceeded for testing');
        });

        it('should provide standard rate limit headers when 429 is returned', async () => {
            const res = await request(testApp).get('/test-route');
            expect(res.status).toBe(429);
            expect(res.headers['retry-after']).toBeDefined();
        });
    });
});
