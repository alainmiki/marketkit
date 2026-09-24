import { Router } from "express";
import Product from "./products/models.js";
import { auth } from "./config/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { loginRequired, adminRequired } from "./middlewares.js";

const router = Router();

router.use(loginRequired);
router.use(adminRequired);

router.get("/", async (req, res) => {
    try {
        const [productsCount, usersResult] = await Promise.all([
            Product.countDocuments(),
            auth.api.listUsers({
                headers: fromNodeHeaders(req.headers),
                query: { limit: 5, sortBy: "createdAt", sortDirection: "desc" },
            }),
        ]);

        const recentUsers = usersResult?.users || [];

        res.render("admin/dashboard", {
            title: "Admin Dashboard",
            stats: {
                products: productsCount,
                users: recentUsers.length,
            },
            recentUsers,
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load dashboard" },
            user: req.user,
        });
    }
});

export default router;
