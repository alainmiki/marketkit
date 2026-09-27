import { Router } from "express";
import Product,{Cart,Order} from "./models.js";

import { loginRequired } from "../middlewares.js";

const router = Router();

const PRODUCTS_PER_PAGE = 8;

const getProductFilter = (query) => {
    const filter = {};

    if (query.category) {
        filter.category = query.category;
    }

    if (query.search) {
        filter.name = { $regex: query.search, $options: "i" };
    }

    if (query.minPrice || query.maxPrice) {
        filter.price = {};
        if (query.minPrice) filter.price.$gte = Number(query.minPrice);
        if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }

    if (query.inStock === "true") {
        filter.stock = { $gt: 0 };
    }

    return filter;
};

class Pagination {
    constructor(model, filter = {}, sort = {}, page = 1, limit = 12, maxVisiblePages = 5) {
        this.model = model;
        this.filter = filter;
        this.sort = sort;
        this.page = Math.max(1, parseInt(page, 10) || 1);
        this.limit = Math.max(1, parseInt(limit, 10) || 12);
        this.skip = (this.page - 1) * this.limit;
        this.maxVisiblePages = maxVisiblePages;
    }

    async getPageData() {
        try {
            const [items, total] = await Promise.all([
                await this.model.find(this.filter).sort(this.sort).limit(this.limit).skip(this.skip),
                await this.model.find(this.filter).countDocuments(),
            ]);
            

            this.total = Math.max(0, total);
            this.totalPages = Math.max(1, Math.ceil(this.total / this.limit));
            this.hasNext = this.page < this.totalPages;
            this.hasPrev = this.page > 1;

            return items;
        } catch (error) {
            console.error("Pagination error:", error);
            return [];
        }
    }

    getPaginationMeta() {
        const half = Math.floor(this.maxVisiblePages / 2);
        let startPage = Math.max(1, this.page - half);
        let endPage = Math.min(this.totalPages || 1, startPage + this.maxVisiblePages - 1);

        if (endPage - startPage + 1 < this.maxVisiblePages) {
            startPage = Math.max(1, endPage - this.maxVisiblePages + 1);
        }

        const pageRange = [];
        for (let i = startPage; i <= endPage; i++) {
            pageRange.push(i);
        }

        return {
            page: this.page,
            limit: this.limit,
            total: this.total || 0,
            totalPages: this.totalPages || 1,
            hasNext: this.hasNext || false,
            hasPrev: this.hasPrev || false,
            nextPage: this.hasNext ? this.page + 1 : null,
            prevPage: this.hasPrev ? this.page - 1 : null,
            page_range: pageRange,
            start_index: this.total === 0 ? 0 : this.skip + 1,
            end_index: Math.min(this.skip + this.limit, this.total),
        };
    }
}

const getSortOption = (sortBy = "newest") => {
    switch (sortBy) {
        case "price-asc":
            return { price: 1 };
        case "price-desc":
            return { price: -1 };
        case "name":
            return { name: 1 };
        case "newest":
        default:
            return { createdAt: -1 };
    }
};

const renderProductList = async (req, res) => {
    try {
        const query = req.query || {};
        const page = Math.max(1, Number(query.page) || 1);
        const limit = PRODUCTS_PER_PAGE;

        const filter = getProductFilter(query);
        const sort = getSortOption(query.sort);

        const pagination = new Pagination(Product, filter, sort, page, limit);
        const products = await pagination.getPageData();

        res.render("products/list", {
            title: query.category ? query.category.charAt(0).toUpperCase() + query.category.slice(1) : "All Products",
            products,
            pagination: pagination.getPaginationMeta(),
            filters: {
                category: query.category || "",
                search: query.search || "",
                minPrice: query.minPrice || "",
                maxPrice: query.maxPrice || "",
                sort: query.sort || "newest",
                inStock: query.inStock || "",
            },
        });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load products" },
            user: req.user,
        });
    }
};

router.get("/", renderProductList);

router.get("/categories/:category", async (req, res) => {
    const query = {
        category: req.params.category,
        page: Number(req.query.page) || 1,
    };
    await renderProductList({ ...req, query }, res);
});

router.get("/search", async (req, res) => {
    const { searchValue } = req.query;
    const query = {
        ...(searchValue ? { search: searchValue } : {}),
        page: Number(req.query.page) || 1,
    };
    await renderProductList({ ...req, query }, res);
});

router.get("/:id/details", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "Product not found" },
                user: req.user,
            });
        }
        res.render("products/detail", { title: product.name, product });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load product" },
            user: req.user,
        });
    }
});

router.get("/cart/items", loginRequired, async (req, res) => {
    const isJsonRequest = req.headers['x-requested-with'] === 'XMLHttpRequest';
    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            const emptyCart = { items: [], count: 0, subtotal: "0.00", shipping: "0.00", total: "0.00", freeShipping: true };
            if (isJsonRequest) {
                return res.json(emptyCart);
            }
            return res.render("products/cart", {
                title: "Shopping Cart",
                user: req.user,
                cart: { ...emptyCart, items: [] },
            });
        }

        const subtotal = cart.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
        const freeShipping = subtotal > 50;
        const shipping = freeShipping ? 0 : 5.99;
        const total = subtotal + shipping;

        if (isJsonRequest) {
            const items = cart.items.map((item) => {
                const product = item.product || {};
                const itemTotal = (item.priceAtTime || 0) * (item.quantity || 0);
                return {
                    id: item._id,
                    productId: item.product,
                    name: product.name || "Unknown Product",
                    price: product.price || 0,
                    discount: product.discount || 0,
                    quantity: item.quantity,
                    image: product.primaryImage || "/images/product-placeholder.png",
                    total: itemTotal,
                };
            });

            return res.json({
                items,
                count: items.length,
                subtotal: subtotal.toFixed(2),
                shipping: shipping.toFixed(2),
                total: total.toFixed(2),
                freeShipping,
            });
        }

        res.render("products/cart", {
            title: "Shopping Cart",
            user: req.user,
            cart: {
                ...cart.toObject(),
                items: cart.items.map((item) => ({
                    ...item.toObject(),
                    total: (item.priceAtTime * item.quantity),
                })),
                subtotal: subtotal.toFixed(2),
                freeShipping,
                shipping: shipping.toFixed(2),
                total: total.toFixed(2),
            },
        });
    } catch (error) {
        console.error("Cart items error:", error);
        if (isJsonRequest) {
            return res.status(500).json({ error: "Failed to load cart" });
        }
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load cart" },
            user: req.user,
        });
    }
});

router.post("/cart/add", loginRequired, async (req, res) => {
    const { productId, quantity = 1 } = req.body;

    // console.log("Here is the cart details of the product:", productId, quantity);

    try {
        if (!req.user) return res.redirect("/users/login");
        if (!productId) {
            return res.redirect("/products/cart/items");
        }

        const product = await Product.findById(productId);
        // console.log("Here is the product details:", product,req.user.id);
        if (!product) {
            return res.redirect("/products/cart/items");
        }

        const qty = parseInt(quantity);
        if (!Number.isInteger(qty) || qty < 1) {
            return res.redirect("/products/cart/items");
        }

        if (product.stock < qty) {
            return res.redirect("/products/cart/items");
        }

        let cart = await Cart.findOne({ user: req.user.id });
        // await Cart.create({ user: req.user.id })
        // console.log("Here in after create new cart",req.user.id);
        if (!cart) {
            // console.log("Here in create new cart",req.user.id);
            
            cart=await Cart.create({ user: req.user.id })
            // console.log("Here in after create new cart",req.user.id,productId);
        }

        const existingItem = cart.items.find((item) => item.product.toString() === productId);
        if (existingItem) {
            existingItem.quantity += qty;
        } else {
            cart.items.push({
                product: productId,
                quantity: qty,
                priceAtTime: product.price,
            });
        }

        await cart.save();
        // res.redirect("/products/cart?added=true");
        res.redirect(req.headers.referer || "/products/cart/items");
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to add item to cart" },
            user: req.user,
        });
    }
});

router.post("/cart/update/:itemId", loginRequired, async (req, res) => {
    const { quantity } = req.body;

    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.redirect("/products/cart/items");
        }

        const item = cart.items.id(req.params.itemId);
        if (!item) {
            return res.redirect("/products/cart/items");
        }

        const qty = Number(quantity);
        if (Number.isInteger(qty) && qty >= 1) {
            item.quantity = qty;
            await cart.save();
        }

        res.redirect("/products/cart/items");
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to update cart" },
            user: req.user,
        });
    }
});

router.post("/cart/remove/:itemId", loginRequired, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.redirect("/products/cart/items");
        }

        cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
        await cart.save();
        res.redirect("/products/cart/items");
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to remove item from cart" },
            user: req.user,
        });
    }
});

router.post("/cart/clear", loginRequired, async (req, res) => {
    try {
        await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
        res.redirect("/products/cart/items");
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to clear cart" },
            user: req.user,
        });
    }
});

router.get("/checkout", loginRequired, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.redirect("/products/cart/items");
        }

        const subtotal = cart.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
        const shipping = subtotal > 50 ? 0 : 5.99;
        const total = subtotal + shipping;

        res.render("products/checkout", {
            title: "Checkout",
            user: req.user,
            cart,
            subtotal,
            shipping,
            total,
        });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load checkout" },
            user: req.user,
        });
    }
});

router.post("/checkout", loginRequired, async (req, res) => {
    const { shippingAddress, phone, notes } = req.body;

    try {
        if (!shippingAddress || !phone) {
            return res.redirect("/products/checkout");
        }

        const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.redirect("/products/cart/items");
        }

        const subtotal = cart.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
        const shipping = subtotal > 50 ? 0 : 5.99;
        const total = subtotal + shipping;

        const order = await Order.create({
            user: req.user.id,
            items: cart.items.map((item) => ({
                product: item.product._id,
                quantity: item.quantity,
                priceAtTime: item.priceAtTime,
            })),
            total,
            status: "pending",
            shippingAddress,
            phone,
            notes: notes || "",
        });

        await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

        const orderWithProducts = await Order.findById(order._id).populate("items.product");
        res.render("products/order_confirmation", {
            title: "Order Confirmed",
            user: req.user,
            order: {
                ...orderWithProducts.toObject(),
                displayId: order._id.toString().slice(-8),
                subtotal: subtotal.toFixed(2),
                shipping: shipping.toFixed(2),
                total: total.toFixed(2),
            },
        });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to place order" },
            user: req.user,
        });
    }
});

router.get("/orders", loginRequired, async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = 10;

        // const query = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).populate("items.product");
        const pagination = new Pagination(Order, { user: req.user.id }, { createdAt: -1 }, page, limit);
        const orders = await pagination.getPageData();


        res.render("products/orders", {
            title: "My Orders",
            user: req.user,
            query:orders,
            pagination: pagination.getPaginationMeta(),
        });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load orders" },
            user: req.user,
        });
    }
});

router.get("/orders/:id", loginRequired, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("items.product");
        if (!order) {
            return res.status(404).render("404", {
                title: "Not Found",
                error: { statusCode: 404, message: "Order not found" },
                user: req.user,
            });
        }

        if (order.user.toString() !== req.user.id) {
            return res.status(403).render("403", {
                title: "Access Denied",
                error: { statusCode: 403, message: "You do not have permission to view this order" },
                user: req.user,
            });
        }

        const subtotal = order.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
        const shipping = subtotal > 50 ? 0 : 5.99;
        const total = subtotal + shipping;

        const orderObj = order.toObject();
        res.render("products/order_detail", {
            title: `Order #${order._id.toString().slice(-8)}`,
            user: req.user,
            order: {
                ...orderObj,
                subtotal: subtotal.toFixed(2),
                freeShipping: shipping === 0,
                shipping: shipping.toFixed(2),
                total: total.toFixed(2),
                displayId: order._id.toString().slice(-8),
                items: orderObj.items.map((item) => ({
                    ...item,
                    itemTotal: (item.priceAtTime * item.quantity).toFixed(2),
                })),
            },
        });
    } catch (error) {
        res.status(500).render("500", {
            title: "Server Error",
            error: { statusCode: 500, message: "Failed to load order" },
            user: req.user,
        });
    }
});

export default router;
