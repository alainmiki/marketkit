import express from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import path from "path"
import { fileURLToPath } from "url"
import miki, { registerContextProcessor } from "miki-template"
import dotenv from "dotenv"
import userRoute from "./users/router.js";
import adminUserRoute from "./users/adminRoute.js";
import adminDashboardRoute from "./adminRoute.js";
import productsRoute from "./products/route.js";
import adminProductsRoute from "./products/adminRoute.js";
import { auth } from "./config/auth.js";
import cookieParser from "cookie-parser";
import { globalErrorHandler, handleBetterAuthErrors } from "./middlewares.js";

dotenv.config()


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express()
app.use(express.json())
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'static', 'js')));
app.use('/css', express.static(path.join(__dirname, 'static', 'css')));
app.use(express.static(path.join(__dirname, 'upload')));
app.use('/media', express.static(path.join(__dirname, 'media')));

/**
 * Session attachment middleware.
 * 
 * Runs on every request to check for an existing better-auth session.
 * Uses better-auth's `getSession()` API with properly converted Node.js headers
 * (via `fromNodeHeaders`). If a valid session exists, attaches:
 * - req.user: The authenticated user object (available in routes and templates)
 * - req.sessionData: The session object (session ID, expiry, etc.)
 * - res.locals.user: Makes `user` available in all miki-template templates
 * 
 * If no valid session exists, sets all three to null.
 * This middleware ensures every template has access to the `user` variable,
 * enabling conditional rendering (e.g., show Login/Register vs Logout links).
 */
async function attachUser(req, res, next) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (session?.user) {
            req.user = session.user;
            req.sessionData = session.session;
            res.locals.user = session.user;
        } else {
            req.user = null;
            req.sessionData = null;
            res.locals.user = null;
        }
    } catch (error) {
        console.error("Session error:", error);
        req.user = null;
        req.sessionData = null;
        res.locals.user = null;
    }
    next();
}

app.use(attachUser);

//  miki template setup section
const TemplateDir = path.join(__dirname, 'templates')
miki.setupExpress(app, { extension: 'html', views: TemplateDir });

// miki context processor 
registerContextProcessor((ctx) => ({
    appTitle: "Market Kit",
    user: ctx.req?.user,
    req: ctx.req
}));

app.get("/", (req, res) => {
    res.render("home", { title: "Home", user: req.user });
});

app.get("/products/shop", (req, res) => {
    res.render("products/shop", { title: "Shop", user: req.user });
});

app.use("/products", productsRoute);

app.use("/admin", adminDashboardRoute);
app.use("/admin/products", adminProductsRoute);
app.use("/admin/users", adminUserRoute);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use("/users", userRoute);

// Test route for 500 error (remove in production)
app.get("/test-500", (req, res, next) => {
    const err = new Error('Test 500 error');
    err.status = 500;
    next(err);
});

// Catch-all 404 handler (must be after all routes but before error handlers)
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Better-auth error handler middleware (catches errors from better-auth API calls)
app.use(handleBetterAuthErrors);

// Global error handler middleware (must be registered last)
app.use(globalErrorHandler);

export default app;


