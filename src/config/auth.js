import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins"
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { sendMail } from "./email.js";
import mongoose from "mongoose";
dotenv.config()
const client = new MongoClient(process.env.mongodbUri);
let db;

try {
    await client.connect();
    db = client.db();
    console.log("MongoDB connected for better-auth");
} catch (error) {
    console.error("Failed to connect to MongoDB for better-auth:", error);
    process.exit(1);
}

export const auth = betterAuth({
    database: mongodbAdapter(db, {
        models: {
            user: "users",
            session: "session",
            account: "account",
            verification: "verification"
        }
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        requireEmailVerification: true,
        autoSignIn: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            void sendMail({
                to: user.email,
                subject: "Reset your password",
                text: `Click the link to reset your password: ${url}`,
            });
        },
        onPasswordReset: async ({ user }, request) => {
            console.log(`Password for user ${user.email} has been reset.`);
        },

        onExistingUserSignUp: async ({ user }, request) => {
            void sendMail({
                to: user.email,
                subject: "Sign-up attempt with your email",
                text: "Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.",
            });
        },
    },

    socialProviders: {
        google: { clientId: process.env.GOOGLE_ID, clientSecret: process.env.GOOGLE_SECRET },
        github: { clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET },
        facebook: { clientId: process.env.FB_ID, clientSecret: process.env.FB_SECRET },
    },

    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            await sendMail({
                to: user.email,
                subject: "Verify your account",
                html: `<p>Welcome! Please verify your account:</p><a href="${url}">${url}</a>`,
            });
        },

        sendPasswordResetEmail: async ({ email, url }) => {
            await sendMail({
                to: email,
                subject: "Reset your password",
                html: `<p>You requested a password reset. Click below:</p><a href="${url}">${url}</a>`,
            });
        },

        sendChangeEmailVerification: async ({ email, url }) => {
            await sendMail({
                to: email,
                subject: "Confirm your new email",
                html: `<p>Click below to confirm your new email:</p><a href="${url}">${url}</a>`,
            });
        },
    },

    plugins: [
        admin({ defaultRole: "user", adminRoles: ["admin"] }),
        username()
    ],

    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: false,
            sameSite: 'lax',
            maxAge: 60 * 60,
            secure: process.env.NODE_ENV === 'production'
        },
    },
    secret: process.env.BETTER_AUTH_SECRET,
    advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
        defaultCookieAttributes: {
            sameSite: "lax",
            secure: process.env.NODE_ENV === 'production',
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
            path: "/",
        },
        trustedOrigins: process.env.NODE_ENV === 'production' 
            ? [process.env.APP_URL].filter(Boolean) 
            : ['http://localhost:8000', 'http://127.0.0.1:8000'],
    },
    account: {
        skipStateCookieCheck: false,
    }
});

