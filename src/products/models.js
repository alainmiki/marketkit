import mongoose, { Schema, model } from 'mongoose';


/**
 * Image sub-schema for product images.
 * Each image tracks its URL, file size, and stored filename.
 */
const ImageSchema = new Schema({
    url: { type: String, required: true },
    size: { type: Number, required: true },
    filename: { type: String, required: true },
}, { _id: false });


/**
 * Product schema for the e-commerce platform.
 * 
 * Fields:
 * - name: Product name (required)
 * - description: Product description (required)
 * - price: Base price in cents (required, minimum 0)
 * - discount: Percentage discount 0-100 (default: 0)
 * - category: Product category (required)
 * - images: Array of ImageSchema (primary image first)
 * - stock: Available quantity (default: 0)
 * - isAvailable: Whether the product is available for purchase (default: true)
 * 
 * Timestamps are automatically added (createdAt, updatedAt).
 */
const productSchema = new Schema({
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price must be non-negative'] },
    discount: { type: Number, default: 0, min: [0, 'Discount must be non-negative'], max: [100, 'Discount cannot exceed 100%'] },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    images: { type: [ImageSchema], default: [] },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
    isAvailable: { type: Boolean, default: true },
}, { timestamps: true });


/**
 * Virtual property for the discounted price.
 * Returns the price after applying the discount percentage.
 * @returns {number} The discounted price
 */
productSchema.virtual('discountedPrice').get(function () {
    if (this.discount > 0) {
        return Math.round(this.price * (1 - this.discount / 100));
    }
    return this.price;
});

/**
 * Virtual property for the primary (first) image URL.
 * @returns {string|null} URL of the first image or null if no images
 */
productSchema.virtual('primaryImage').get(function () {
    return this.images && this.images.length > 0 ? this.images[0].url : null;
});

/**
 * Schema methods to ensure virtuals are included in JSON output
 */
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });


/**
 * Cart schema for user shopping carts.
 * 
 * Each cart belongs to a single user and contains multiple cart items.
 * The cart total is automatically calculated from item prices.
 */
const CartSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
        priceAtTime: { type: Number, required: true }, // Price snapshot when added to cart
    }],
}, { timestamps: true });

/**
 * Virtual property for cart item count (total quantity across all items).
 */
CartSchema.virtual('itemCount').get(function () {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

/**
 * Virtual property for cart total (sum of priceAtTime * quantity).
 */
CartSchema.virtual('total').get(function () {
    return this.items.reduce((total, item) => total + (item.priceAtTime * item.quantity), 0);
});

CartSchema.set('toJSON', { virtuals: true });
CartSchema.set('toObject', { virtuals: true });


/**
 * Order schema for completed purchases.
 * 
 * Each order belongs to a single user and can contain multiple products.
 * Tracks order status and payment information.
 */
const orderItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    priceAtTime: { type: Number, required: true },
}, { _id: false });

const OrderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: [true, 'Order must have at least one item'] },
    total: { type: Number, required: true, min: [0, 'Total must be non-negative'] },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending',
    },
    paymentIntentId: { type: String },
}, { timestamps: true });


/**
 * Pre-save hook to calculate the order total from items.
 * Ensures the total is always up to date with the items.
 */
OrderSchema.pre('save', function () {
    this.total = this.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
});


export const Product = model('Product', productSchema);
export const Cart = model('Cart', CartSchema);
export const Order = model('Order', OrderSchema);

export default Product;
