import { Router } from "express";
import Product from "../products/models.js";
import { adminRequired, loginRequired } from "../middlewares.js";
import upload from "../config/multer.js";

const router = Router();

const ADMIN_PRODUCTS_VIEWS_PATH = "admin/products";

router.use(loginRequired);
router.use(adminRequired);

router.get("/", async (req, res) => {

    
    try {
        const products = await Product.find({}).sort({ createdAt: -1 });
        res.render(`${ADMIN_PRODUCTS_VIEWS_PATH}/list`, {
            title: "Manage Products",
            products,
        });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load products" },
            user: req.user,
        });
    }
});



router.get("/create", (req, res) => {
    res.render(`${ADMIN_PRODUCTS_VIEWS_PATH}/form`, {
        title: "Create Product",
        product: null,
    });
});



router.post("/create", upload.array("productImage"), async (req, res) => {
    const { name, description, price, discount, category, stock, isAvailable } = req.body;

    try {
        const productData = {
            name,
            description,
            price: Number(price),
            discount: Number(discount || 0),
            category,
            stock: Number(stock || 0),
            isAvailable: isAvailable === "on" || isAvailable === true,
        };

        if (req.files) {
            for (const file of req.files) {
                if (!productData.images) {
                    productData.images = [];
                }
                productData.images.push({
                    url: `/media/uploads/${file.filename}`,
                    size: file.size,
                    filename: file.filename,
                });
            }
        }

        await Product.create(productData);
        res.redirect("/admin/products");
    } catch (error) {
        const validationErrors = {};
        if (error.name === "ValidationError") {
            for (const [key, value] of Object.entries(error.errors)) {
                validationErrors[key] = value.message;
            }
        }
        res.render(`${ADMIN_PRODUCTS_VIEWS_PATH}/form`, {
            title: "Create Product",
            product: { name, description, price, discount, category, stock, isAvailable },
            error: "Error creating product",
            validationErrors,
            old: { name, description, price, discount, category, stock, isAvailable },
        });
    }
});

router.get("/:id/edit", async (req, res) => {
    try {
        // console.log("Edit product id:", req.params.id);
        const product = await Product.findById(req.params.id);
        // console.log("Product found:", !!product);
        if (!product) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "Product not found" },
                user: req.user,
            });
        }
        res.render(`${ADMIN_PRODUCTS_VIEWS_PATH}/form`, {
            title: `Edit ${product.name}`,
            product,
        });
    } catch (error) {
        console.error("Edit product error:", error);
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load product" },
            user: req.user,
        });
    }
});

router.post("/:id/edit", upload.single("productImage"), async (req, res) => {
    const { name, description, price, discount, category, stock, isAvailable, removeImage } = req.body;

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "Product not found" },
                user: req.user,
            });
        }

        const updateData = {
            name,
            description,
            price: Number(price),
            discount: Number(discount || 0),
            category,
            stock: Number(stock || 0),
            isAvailable: isAvailable === "on" || isAvailable === true,
        };

        if (req.file) {
            updateData.images = [
                {
                    url: `/media/uploads/${req.file.filename}`,
                    size: req.file.size,
                    filename: req.file.filename,
                },
            ];
        } else if (removeImage === "on") {
            updateData.images = [];
        }

        await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.redirect("/admin/products");
    } catch (error) {
        const validationErrors = {};
        if (error.name === "ValidationError") {
            for (const [key, value] of Object.entries(error.errors)) {
                validationErrors[key] = value.message;
            }
        }
        const oldData = { name, description, price, discount, category, stock, isAvailable };
        res.render(`${ADMIN_PRODUCTS_VIEWS_PATH}/form`, {
            title: "Edit Product",
            product: { ...oldData, id: req.params.id },
            error: "Error updating product",
            validationErrors,
            old: oldData,
        });
    }
});

router.get("/:id/delete", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "Product not found" },
                user: req.user,
            });
        }
        res.render(`${ADMIN_PRODUCTS_VIEWS_PATH}/confirm_delete`, {
            title: `Delete ${product.name}`,
            product,
        });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load product" },
            user: req.user,
        });
    }
});

router.post("/:id/delete", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "Product not found" },
                user: req.user,
            });
        }
        await Product.findByIdAndDelete(req.params.id);
        res.redirect("/admin/products");
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to delete product" },
            user: req.user,
        });
    }
});

export default router;
