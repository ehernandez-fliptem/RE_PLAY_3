import rateLimit from 'express-rate-limit';

export const limiterAuth = rateLimit({
    windowMs: 3600000, // 1 hour
    limit: 15, // Limit each IP to 15 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 419,
    message: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
});

export const limiterBasic = rateLimit({
    windowMs: 3600000, // 1 hour
    limit: 150, // Limit each IP to 150 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 419,
    message: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
});

export const limiterNormal = rateLimit({
    windowMs: 3600000, // 1 hour
    limit: 250, // Limit each IP to 250 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 419,
    message: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
});

export const limiterAdvanced = rateLimit({
    windowMs: 3600000, // 1 hour
    limit: 350, // Limit each IP to 350 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 419,
    message: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
});

export const limiter404 = rateLimit({
    windowMs: 3600000, // 1 hour
    limit: 10, // Limit each IP to 10 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 419,
    message: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
});