import express from "express";
import { auth } from "../config/auth.js";
import upload from "../config/multer.js";
import dotenv from "dotenv";
import path from "path";
import Order from "../products/models.js";
import { authRateLimit } from "../config/rateLimiter.js";

dotenv.config()

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = express.Router();

router.use(authRateLimit);


// Login
router.get("/login", (req, res) => {
    if (req.user) return res.redirect("/")
    res.render("login")
});

router.post("/login", async (req, res) => {
    let { email, password, rememberMe } = req.body;
    rememberMe = rememberMe ? true : false;

    try {
        if (!email || !password) {
            return res.render("login", { error: "Make sure to fill all the inputs before submitting" });
        }

        email = String(email).trim();
        password = String(password);

        if (email.length > 254 || password.length > 128 || password.length < 1) {
            return res.render("login", { error: "Invalid credentials" });
        }

        let result;
        if (email.includes("@")) {
            result = await auth.api.signInEmail({
                body: { email, password, rememberMe },
                headers: fromNodeHeaders(req.headers),
                returnHeaders: true,
            });
        } else {
            result = await auth.api.signInUsername({
                body: { username: email, password, rememberMe },
                headers: fromNodeHeaders(req.headers),
                returnHeaders: true,
            });

        }

        const setCookieHeader = result.headers.getSetCookie();
        if (setCookieHeader && setCookieHeader.length > 0) {
            for (const cookie of setCookieHeader) {
                res.append("Set-Cookie", cookie);
            }
        }

        if (result.error) return res.render("login", { error: result.error.message });
        return res.redirect("/");
    } catch (error) {
        console.error("Login error:", error);
        if (error.message?.includes("Invalid email or password") || error.status === 401) {
            return res.render("login", { error: "Invalid email or password" });
        }
        return res.render("login", { error: error.message || "Login failed" });
    }
});

// Register
router.get("/register", (req, res) => {
    if (req.user) return res.redirect("/")
    res.render("register")
});

router.post("/register", async (req, res) => {
    let { email, password, username, name, rememberMe } = req.body;

    try {
        email = String(email || "").trim();
        password = String(password || "");
        username = String(username || "").trim();
        name = String(name || "").trim();

        if (!email || !password || !username) {
            return res.render("register", { error: "Email, username, and password are required" });
        }

        if (email.length > 254 || username.length > 50 || username.length < 3) {
            return res.render("register", { error: "Invalid input length" });
        }

        if (password.length < 8 || password.length > 128) {
            return res.render("register", { error: "Password must be between 8 and 128 characters" });
        }

        const result = await auth.api.signUpEmail({
            body: { email, password, username, name },
            headers: fromNodeHeaders(req.headers),
            returnHeaders: true,
        });

        if (result.error) return res.render("register", { error: result.error.message });
        return res.redirect("/users/login");
    } catch (error) {
        console.error("Register error:", error);
        if (error.message?.includes("already exists") || error.status === 409) {
            return res.render("register", { error: "Email or username already in use" });
        }
        return res.render("register", { error: error.message || "Registration failed" });
    }
});

// Dashboard (protected)
router.get("/dashboard", async (req, res) => {
    if (!req.user) return res.redirect("/users/login");

    try {
        const [ordersCount, orders] = await Promise.all([
            Order.countDocuments({ user: req.user.id }),
            Order.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(5),
        ]);

        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

        res.render("dashboard", {
            user: req.user,
            stats: {
                totalOrders: ordersCount,
                wishlistCount: 0,
                totalSpent: totalSpent.toFixed(2),
                reviewCount: 0,
                recentOrders: orders,
            },
        });
    } catch (error) {
        res.render("dashboard", {
            user: req.user,
            stats: {
                totalOrders: 0,
                wishlistCount: 0,
                totalSpent: "0.00",
                reviewCount: 0,
                recentOrders: [],
            },
        });
    }
});

// Logout
router.post("/logout", async (req, res) => {
    try {
        await auth.api.signOut({
            headers: fromNodeHeaders(req.headers),
        });
    } catch (error) {
        console.error("Logout error:", error);
    }

    const cookieNames = [
        'better-auth.session_token',
        'better-auth.session_data',
        'better-auth.dont_remember_token',
        'better-auth.account_data',
        'better-auth.oauth_state',
        '__Secure-better-auth.session_token',
        '__Secure-better-auth.session_data',
        '__Secure-better-auth.dont_remember_token',
        '__Secure-better-auth.account_data',
        '__Secure-better-auth.oauth_state',
    ];

    for (const name of cookieNames) {
        res.clearCookie(name, { path: '/' });
    }

    res.redirect("/users/login");
});

// Forgot password
router.get("/forgot", (req, res) => res.render("forgot"));

router.post("/forgot", async (req, res) => {
    const { email } = req.body;

    try {
        const trimmedEmail = String(email || "").trim();

        if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
            return res.render("forgot", { error: "Please enter a valid email address" });
        }

        const result = await auth.api.requestPasswordReset({
            body: { email: trimmedEmail, redirectTo: process.env.BETTER_AUTH_URL + "/users/reset" },
            headers: fromNodeHeaders(req.headers),
        });

        if (result.error) return res.render("forgot", { error: result.error.message });
        return res.render("forgot", { success: "Reset link sent to your email." });
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.render("forgot", { error: error.message || "Failed to send reset link" });
    }
});

// Reset password
router.get("/reset", (req, res) => {
    res.render("reset", { token: req.query.token })
});

router.post("/reset", async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const result = await auth.api.resetPassword({
            body: { token, newPassword },
            headers: fromNodeHeaders(req.headers),
        });

        if (result.error) return res.render("reset", { error: result.error.message });
        return res.redirect("/users/login");
    } catch (error) {
        console.error("Reset password error:", error);
        return res.render("reset", { error: error.message || "Failed to reset password" });
    }
});

// Change email
router.get("/change-email", (req, res) => res.render("changeEmail"));

router.post("/change-email", async (req, res) => {
    if (!req.user) return res.redirect("/users/login");
    const { newEmail } = req.body;

    try {
        const trimmedEmail = String(newEmail || "").trim();

        if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
            return res.render("changeEmail", { error: "Please enter a valid email address" });
        }

        const result = await auth.api.changeEmail({
            body: { newEmail: trimmedEmail },
            headers: fromNodeHeaders(req.headers),
        });

        if (result.error) return res.render("changeEmail", { error: result.error.message });
        return res.render("changeEmail", { success: "Email updated successfully." });
    } catch (error) {
        console.error("Change email error:", error);
        return res.render("changeEmail", { error: error.message || "Failed to change email" });
    }
});

// change password
router.get("/change-password", (req, res) => {
    res.render("changePassword");
})

router.post("/change-password", async (req, res) => {
    const { newPassword, newPasswordRepeat, currentPassword } = req.body;

    if (newPassword !== newPasswordRepeat) {
        return res.render("changePassword", { message: "new password did not match new password repeat" });
    }

    if (!newPassword || newPassword.length < 8) {
        return res.render("changePassword", { message: "Password must be at least 8 characters" });
    }

    try {
        const result = await auth.api.changePassword({
            body: {
                newPassword,
                currentPassword: currentPassword || "",
                revokeOtherSessions: true,
            },
            headers: fromNodeHeaders(req.headers),
        });

        if (result.error) return res.render("changePassword", { message: result.error.message });
        return res.redirect("/users/login");
    } catch (error) {
        console.error("Change password error:", error);
        return res.render("changePassword", { message: error.message || "Failed to change password" });
    }
})

// Update avatar
router.get("/profile", (req, res) => {
    if (!req.user) return res.redirect("/users/login");
    res.render("profile", { user: req.user });
});

router.post("/profile/avatar", async (req, res) => {
    if (!req.user) return res.redirect("/users/login");
    const { avatarUrl } = req.body;

    try {
        const result = await auth.api.updateUser({
            headers: fromNodeHeaders(req.headers),
            body: { image: avatarUrl, name: req.user.name, username: req.user.username },
        });

        if (result.error) return res.render("profile", { user: req.user, error: result.error.message });
        return res.redirect("/users/profile");
    } catch (error) {
        console.error("Update avatar error:", error);
        return res.render("profile", { user: req.user, error: error.message || "Failed to update avatar" });
    }
});




// Upload avatar file
router.post("/profile/upload", upload.single("avatar"), async (req, res) => {
    if (!req.user) return res.redirect("/users/login");

    if (!req.file) {
        return res.render("profile", { user: req.user, error: "No file uploaded. Please select an image." });
    }

    try {
        const avatarPath = `/media/uploads/${req.file.filename}`;
        const result = await auth.api.updateUser({
            headers: fromNodeHeaders(req.headers),
            body: { image: avatarPath, name: req.user.name, username: req.user.username },
        });

        if (result.error) return res.render("profile", { user: req.user, error: result.error.message });
        return res.redirect("/users/profile");
    } catch (error) {
        console.error("Upload avatar error:", error);
        return res.render("profile", { user: req.user, error: error.message || "Failed to upload avatar" });
    }
});


// Update profile (name and username)
router.post("/profile/update", async (req, res) => {
    if (!req.user) return res.redirect("/users/login");
    const { name, username } = req.body;

    try {
        const result = await auth.api.updateUser({
            headers: fromNodeHeaders(req.headers),
            body: { name, username },
        });

        if (result.error) return res.render("profile", { user: req.user, error: result.error.message });
        return res.redirect("/users/profile");
    } catch (error) {
        console.error("Update profile error:", error);
        return res.render("profile", { user: req.user, error: error.message || "Failed to update profile" });
    }
});

// Delete account
router.post("/delete-account", async (req, res) => {
    if (!req.user) return res.redirect("/users/login");

    try {
        await auth.api.deleteUser({
            headers: fromNodeHeaders(req.headers),
        });
    } catch (error) {
        console.error("Delete account error:", error);
    }

    // Clear session
    try {
        const result = await auth.api.signOut({
            headers: fromNodeHeaders(req.headers),
            returnHeaders: true,
        });
        const setCookieHeader = result.headers?.getSetCookie();
        if (setCookieHeader && setCookieHeader.length > 0) {
            for (const cookie of setCookieHeader) {
                res.append("Set-Cookie", cookie);
            }
        }
    } catch (error) {
        console.error("Sign out error during account deletion:", error);
    }

    res.redirect("/users/login");
});


// social auth section
// Use direct Better Auth built-in endpoint from the client to ensure state cookies are set correctly.

export default router;
