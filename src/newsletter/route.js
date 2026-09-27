import { Router } from "express";
import Newsletter from "./models.js";
import { newsletterRateLimit } from "../config/rateLimiter.js";

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(newsletterRateLimit);

router.post("/subscribe", async (req, res) => {
    const { email, name } = req.body;

    try {
        if (!email || typeof email !== "string") {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const trimmedEmail = email.trim().toLowerCase();

        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address" });
        }

        if (trimmedEmail.length > 254) {
            return res.status(400).json({ success: false, message: "Email address is too long" });
        }

        const existing = await Newsletter.findOne({ email: trimmedEmail });
        if (existing) {
            if (existing.isActive) {
                return res.status(400).json({ success: false, message: "You are already subscribed to our newsletter" });
            }
            existing.isActive = true;
            await existing.save();
        } else {
            await Newsletter.create({
                email: trimmedEmail,
                name: typeof name === "string" ? name.trim().slice(0, 100) : "",
            });
        }

        res.json({ success: true, message: "Successfully subscribed to newsletter!" });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "You are already subscribed to our newsletter" });
        }
        console.error("Newsletter subscribe error:", error);
        res.status(500).json({ success: false, message: "Failed to subscribe. Please try again." });
    }
});

export default router;
