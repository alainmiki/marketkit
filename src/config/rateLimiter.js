const rateLimitMap = new Map();

export function rateLimit(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000;
    const maxRequests = options.maxRequests || 100;
    const keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress || 'unknown');

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        if (!rateLimitMap.has(key)) {
            rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }

        const record = rateLimitMap.get(key);

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            return next();
        }

        record.count++;

        if (record.count > maxRequests) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ message: 'Too many requests, please try again later.' });
        }

        next();
    };
}

export function authRateLimit(req, res, next) {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        keyGenerator: (req) => `auth:${req.ip || req.connection.remoteAddress || 'unknown'}`,
    })(req, res, next);
}

export function newsletterRateLimit(req, res, next) {
    return rateLimit({
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        keyGenerator: (req) => `newsletter:${req.ip || req.connection.remoteAddress || 'unknown'}`,
    })(req, res, next);
}
