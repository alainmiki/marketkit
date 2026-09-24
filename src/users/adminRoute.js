import { Router } from "express";
import { auth } from "../config/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { loginRequired, adminRequired } from "../middlewares.js";

const router = Router();

const ADMIN_USERS_VIEWS_PATH = "admin/users";

router.use(loginRequired);
router.use(adminRequired);


router.get("/", async (req, res) => {
    try {
        const result = await auth.api.listUsers({
            headers: fromNodeHeaders(req.headers),
            query: {
                limit: 100,
                sortBy: "createdAt",
                sortDirection: "desc",
            },
        });

        const users = result?.users || [];
        res.render(`${ADMIN_USERS_VIEWS_PATH}/list`, {
            title: "Manage Users",
            users,
            searchValue: "",
            searchField: "email",
        });
    } catch (error) {
        console.error("List users error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load users" },
            user: req.user,
        });
    }
});

router.get("/search", async (req, res) => {
    const { searchValue, searchField = "email" } = req.query;

    try {
        const result = await auth.api.listUsers({
            headers: fromNodeHeaders(req.headers),
            query: {
                searchValue: searchValue || "",
                searchField,
                searchOperator: "contains",
                limit: 100,
                sortBy: "createdAt",
                sortDirection: "desc",
            },
        });

        const users = result?.users || [];
        res.render(`${ADMIN_USERS_VIEWS_PATH}/list`, {
            title: "Manage Users",
            users,
            searchValue: searchValue || "",
            searchField,
        });
    } catch (error) {
        console.error("Search users error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to search users" },
            user: req.user,
        });
    }
});

router.get("/:id/edit", async (req, res) => {
    try {
        const result = await auth.api.getUser({
            headers: fromNodeHeaders(req.headers),
            query: { id: req.params.id },
        });

        const user = result?.user || result;
        if (!user) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "User not found" },
                user: req.user,
            });
        }

        res.render(`${ADMIN_USERS_VIEWS_PATH}/form`, {
            title: `Edit User: ${user.name || user.email}`,
            user,
        });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load user" },
            user: req.user,
        });
    }
});

router.post("/:id/edit", async (req, res) => {
    const { name, email, image } = req.body;

    try {
        const result = await auth.api.adminUpdateUser({
            headers: fromNodeHeaders(req.headers),
            body: {
                userId: req.params.id,
                data: { name, email, image },
            },
        });

        if (result?.error) {
            return res.render(`${ADMIN_USERS_VIEWS_PATH}/form`, {
                title: "Edit User",
                user: { id: req.params.id, name, email, image },
                error: result.error.message || "Failed to update user",
            });
        }

        res.redirect("/admin/users");
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to update user" },
            user: req.user,
        });
    }
});

router.post("/:id/set-role", async (req, res) => {
    const { role } = req.body;

    try {
        const result = await auth.api.setRole({
            headers: fromNodeHeaders(req.headers),
            body: {
                userId: req.params.id,
                role: role || "user",
            },
        });

        if (result?.error) {
            return res.redirect(`/admin/users/${req.params.id}/edit?error=${encodeURIComponent(result.error.message || "Failed to set role")}`);
        }

        res.redirect(`/admin/users/${req.params.id}/edit?success=${encodeURIComponent("Role updated successfully")}`);
    } catch (error) {
        console.error("Set role error:", error);
        res.redirect(`/admin/users/${req.params.id}/edit?error=${encodeURIComponent(error.message || "Failed to set role")}`);
    }
});

router.post("/:id/ban", async (req, res) => {
    const { banReason, banExpiresIn } = req.body;

    try {
        const result = await auth.api.banUser({
            headers: fromNodeHeaders(req.headers),
            body: {
                userId: req.params.id,
                banReason: banReason || "",
                banExpiresIn: banExpiresIn ? Number(banExpiresIn) : undefined,
            },
        });

        if (result?.error) {
            return res.redirect(`/admin/users/${req.params.id}/edit?error=${encodeURIComponent(result.error.message || "Failed to ban user")}`);
        }

        res.redirect(`/admin/users/${req.params.id}/edit?success=${encodeURIComponent("User banned successfully")}`);
    } catch (error) {
        console.error("Ban user error:", error);
        res.redirect(`/admin/users/${req.params.id}/edit?error=${encodeURIComponent(error.message || "Failed to ban user")}`);
    }
});

router.post("/:id/unban", async (req, res) => {
    try {
        const result = await auth.api.unbanUser({
            headers: fromNodeHeaders(req.headers),
            body: {
                userId: req.params.id,
            },
        });

        if (result?.error) {
            return res.redirect(`/admin/users/${req.params.id}/edit?error=${encodeURIComponent(result.error.message || "Failed to unban user")}`);
        }

        res.redirect(`/admin/users/${req.params.id}/edit?success=${encodeURIComponent("User unbanned successfully")}`);
    } catch (error) {
        console.error("Unban user error:", error);
        res.redirect(`/admin/users/${req.params.id}/edit?error=${encodeURIComponent(error.message || "Failed to unban user")}`);
    }
});

router.get("/:id/delete", async (req, res) => {
    try {
        const result = await auth.api.getUser({
            headers: fromNodeHeaders(req.headers),
            query: { id: req.params.id },
        });

        const user = result?.user || result;
        if (!user) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "User not found" },
                user: req.user,
            });
        }

        res.render(`${ADMIN_USERS_VIEWS_PATH}/confirm_delete`, {
            title: `Delete User: ${user.name || user.email}`,
            user,
        });
    } catch (error) {
        console.error("Get user for delete error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load user" },
            user: req.user,
        });
    }
});

router.post("/:id/delete", async (req, res) => {
    try {
        await auth.api.removeUser({
            headers: fromNodeHeaders(req.headers),
            body: {
                userId: req.params.id,
            },
        });

        res.redirect("/admin/users");
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to delete user" },
            user: req.user,
        });
    }
});

export default router;
