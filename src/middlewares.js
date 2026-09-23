/**
 * Authentication and error handling middlewares
 * @module middlewares
 * 
 * This module provides:
 * - loginRequired: Protects routes from unauthenticated access
 * - adminRequired: Protects routes from non-admin access
 * - handleBetterAuthErrors: Catches and formats better-auth API errors
 * - globalErrorHandler: Express global error handler for unhandled errors
 * 
 * Error handling philosophy:
 * - JSON/API requests (Content-Type: application/json or XMLHttpRequest): Return JSON responses
 * - Browser (SSR) requests: Render error templates via miki-template engine
 * 
 * Dependencies:
 * - @better-auth/node for header conversion (fromNodeHeaders)
 */



/**
 * Middleware that requires an authenticated user session.
 * 
 * If no user is attached to the request (via the attachUser middleware in app.js),
 * this middleware will block the request. The response format depends on the
 * request type:
 * - JSON/API requests (Content-Type: application/json): Returns 401 Unauthorized
 * - Browser requests: Redirects to the login page
 * 
 * @param {import('express').Request} req - Express request object (must have req.user set by attachUser middleware)
 * @param {import('express').Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|import('express').Response}
 */
export async function loginRequired(req, res, next) {
    if (!req.user) {
        if (req.headers['content-type'] === 'application/json' || req.xhr) {
            return res.status(401).json({ message: 'Login required' });
        }
        return res.redirect('/users/login');
    }
    next();
}


/**
 * Middleware that requires an authenticated user with admin privileges.
 * 
 * Checks both that a user is authenticated AND that the user has the admin
 * flag set. The `isAdmin` property is populated by the admin plugin in
 * better-auth and should be available on req.user.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|import('express').Response}
 */
export async function adminRequired(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        if (req.headers['content-type'] === 'application/json' || req.xhr) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        return res.redirect('/users/login');
    }
    next();
}


/**
 * Error-handling middleware for better-auth API calls.
 * 
 * better-auth API methods (e.g., auth.api.signInEmail, auth.api.getSession)
 * throw APIError instances when authentication fails. This middleware catches
 * those errors and formats the response appropriately based on the request type.
 * 
 * better-auth APIErrors have the following properties:
 * - message: The error message (e.g., "Invalid email or password")
 * - status: HTTP status code (e.g., 401, 403, 409)
 * - code: Better-auth error code (e.g., "INVALID_EMAIL_OR_PASSWORD")
 * 
 * Response handling:
 * - JSON/API requests: Returns a JSON error response with status and code
 * - Browser requests: Redirects to login page with error message in query string
 *   (the login template reads `?error=` for display)
 * 
 * @param {Error|Object} error - The error thrown by better-auth API
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {Function} next - Express next middleware function (not used, but required by Express error middleware signature)
 * @returns {import('express').Response}
 */
export async function handleBetterAuthErrors(error, req, res, next) {
    // Only handle better-auth API errors; pass everything else to the global error handler
    const isBetterAuthError = error?.code || error?.status === 'UNAUTHORIZED' || error?.status === 'BAD_REQUEST' || error?.statusCode === 401 || error?.statusCode === 403 || error?.statusCode === 409;

    if (!isBetterAuthError) {
        return next(error);
    }

    console.error('Better-auth error:', {
        path: req.path,
        method: req.method,
        message: error.message,
        status: error.status || error.statusCode,
        code: error.code,
    });

    const isJsonRequest = req.headers['content-type'] === 'application/json' ||
        req.xhr === true;

    if (isJsonRequest) {
        return res.status(error.status || error.statusCode || 500).json({
            error: error.message || 'An authentication error occurred',
            code: error.code || 'AUTH_ERROR',
        });
    }

    const returnTo = encodeURIComponent(req.originalUrl);
    return res.redirect(`/users/login?error=${encodeURIComponent(error.message || 'Authentication failed')}&returnTo=${returnTo}`);
}


/**
 * Global Express error handling middleware.
 * 
 * This middleware catches all unhandled errors that are passed to `next(error)`
 * in route handlers or other middleware. It should be registered LAST in the
 * middleware stack, after all routes.
 * 
 * Error response format:
 * - JSON/API requests: Returns a JSON object with error details
 * - Browser (SSR) requests: Renders an error template (404.html or 500.html)
 * 
 * In development mode (NODE_ENV !== 'production'):
 * - The full error stack trace is included in the response for debugging
 * In production:
 * - Only a generic error message is returned to avoid leaking implementation details
 * 
 * @param {Error} error - The error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {Function} next - Express next middleware function (not used but required by Express)
 * @returns {import('express').Response}
 */
export function globalErrorHandler(error, req, res, next) {
    // Log the full error for server-side debugging
    console.error('Global error handler:', {
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack,
    });

    // If headers have already been sent, delegate to Express default error handler
    if (res.headersSent) {
        return next(error);
    }

    const isJsonRequest = req.headers['content-type'] === 'application/json' ||
        req.xhr === true;

    const isDevelopment = process.env.NODE_ENV !== 'production';
    const statusCode = error.status || error.statusCode || 500;

    // Prepare error data for templates
    const errorData = {
        statusCode,
        message: error.message || 'An error occurred',
        ...(isDevelopment && { stack: error.stack }),
        ...(error.code && { code: error.code }),
    };

    // JSON/API response
    if (isJsonRequest) {
        return res.status(statusCode).json({
            message: error.message || 'Internal Server Error',
            code: error.code || 'INTERNAL_ERROR',
            ...(isDevelopment && { stack: error.stack }),
        });
    }

    // Browser (SSR) response — render the error template
    try {
        // Use the appropriate error template based on status code
        const template = statusCode === 404 ? '404' : statusCode >= 500 ? '500' : 'error';
        return res.status(statusCode).render(template, {
            title: `Error ${statusCode}`,
            error: errorData,
            user: req.user || null,
        });
    } catch (renderError) {
        // If template rendering fails, fall back to basic HTML
        console.error('Failed to render error template:', renderError.message);
        return res.status(statusCode).send(`
<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error ${statusCode}</title>
    <link rel="stylesheet" href="/css/bootstrap.min.css" />
    <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
    <div class="container py-5 min-vh-100">
        <div class="row justify-content-center">
            <div class="col-md-6 text-center py-5">
                <div class="display-1 fw-bold mb-3">${statusCode}</div>
                <h1 class="h3 mb-3">${error.message || 'Something went wrong'}</h1>
                <p class="text-muted mb-4">${isDevelopment ? (error.stack || '').substring(0, 200) + '...' : 'An unexpected error occurred.'}</p>
                <a href="/" class="btn btn-primary"><i class="bi bi-house-door me-1"></i> Go Back Home</a>
            </div>
        </div>
    </div>
</body>
</html>
        `);
    }
}


export default {
    loginRequired,
    adminRequired,
    handleBetterAuthErrors,
    globalErrorHandler,
};
