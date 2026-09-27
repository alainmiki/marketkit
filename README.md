# MarketKit

A full-stack e-commerce platform built with Node.js, Express, MongoDB, and Better Auth. Features a complete shopping experience with product management, cart functionality, order processing, and an admin dashboard.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Better Auth v1.7.5 (email/password + social OAuth)
- **Templating**: Miki Template Engine (Django-like syntax)
- **Security**: Helmet.js, cookie-parser, CSRF protection
- **File Uploads**: Multer
- **Frontend**: Bootstrap 5.3.3, Bootstrap Icons

## Features

### User Authentication
- Email/password registration and login
- Social authentication (Google, GitHub, Facebook)
- Password reset functionality
- Email change with confirmation
- Remember me sessions
- Secure session management with HttpOnly cookies

### Email Features
- **Email Verification**: New users must verify their email before accessing the account
- **Password Reset**: Users can request a password reset link via email
- **Email Change Confirmation**: Users must confirm email changes via a verification link
- **Duplicate Sign-up Alerts**: Users are notified if someone tries to sign up with their email
- **Nodemailer Integration**: Email sending via configurable SMTP transport
- **Production-Ready**: Supports Gmail, SendGrid, Mailgun, and other SMTP providers

### Product Browsing
- Product catalog with pagination (8 products per page)
- Category-based filtering (Electronics, Fashion, Home & Living, Sports)
- Search functionality with case-insensitive matching
- Price range filtering (min/max)
- In-stock only filter
- Sort options (Newest, Price Low-High, Price High-Low, Name A-Z)
- Product detail pages with add-to-cart functionality

### Shopping Cart
- Add products to cart
- Update item quantities
- Remove items from cart
- Clear entire cart
- Real-time cart count badge in navbar
- Slide-out cart drawer with item preview
- Persistent cart across sessions
- Free shipping on orders over $50

### Checkout & Orders
- Secure checkout process
- Order confirmation page
- Order history with pagination (10 orders per page)
- Order detail view with itemized breakdown
- Order status tracking (pending, processing, shipped, delivered)

### Admin Panel
- Product management (CRUD operations)
  - Create products with multiple images (up to 8)
  - Edit product details
  - Delete products
  - Image upload/removal
- User management
  - View all users
  - Search users
  - Change user roles (admin/user)
  - Ban/unban users
  - Delete users
- Admin dashboard with statistics

### Newsletter
- Email subscription system
- Active/inactive subscription management

## Project Structure

```
marketkit/
├── src/
│   ├── config/
│   │   ├── auth.js          # Better Auth configuration
│   │   ├── email.js         # Nodemailer email service configuration
│   │   └── multer.js        # File upload configuration
│   ├── middlewares.js        # Authentication, cart count, error handling
│   ├── app.js               # Express app setup and routes
│   ├── server.js            # Server entry point
│   ├── products/
│   │   ├── route.js         # Product, cart, checkout, order routes
│   │   ├── adminRoute.js    # Admin product management routes
│   │   └── models.js        # Product, Cart, Order schemas
│   ├── users/
│   │   ├── router.js        # User auth routes
│   │   └── adminRoute.js    # Admin user management routes
│   ├── adminRoute.js        # Admin dashboard route
│   ├── newsletter/
│   │   ├── route.js         # Newsletter subscription routes
│   │   └── models.js        # Newsletter subscription schema
│   └── templates/
│       ├── base.html        # Base template with navbar, footer, scripts
│       ├── home.html        # Homepage with featured products
│       ├── navbar.html      # Navigation bar with cart/user dropdowns
│       ├── 500.html         # Error page
│       ├── products/
│       │   ├── list.html    # Product catalog with filters & pagination
│       │   ├── cart.html    # Shopping cart page
│       │   ├── checkout.html # Checkout form
│       │   ├── orders.html  # Order history
│       │   ├── order_detail.html # Single order view
│       │   └── order_confirmation.html # Order success page
│       ├── admin/
│       │   ├── dashboard.html # Admin statistics
│       │   ├── products/
│       │   │   ├── list.html  # Admin product list
│       │   │   ├── form.html  # Add/edit product
│       │   │   └── confirm_delete.html # Delete confirmation
│       │   └── users/
│       │       ├── list.html  # Admin user list with search
│       │       ├── form.html  # Edit user role/ban status
│       │       └── confirm_delete.html # Delete confirmation
│       └── users/
│           ├── login.html      # Login form
│           ├── register.html   # Registration form
│           ├── forgot.html     # Forgot password
│           ├── reset.html      # Reset password
│           ├── changeEmail.html # Change email
│           ├── changePassword.html # Change password
│           ├── profile.html    # User profile
│           └── dashboard.html  # User dashboard
├── media/
│   └── uploads/              # Uploaded product images
├── public/                   # Static assets (images, CSS)
├── static/
│   ├── css/
│   └── js/
├── .env                      # Environment variables
├── package.json
└── server.js                 # Entry point
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd marketkit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Server
   NODE_ENV=development
   PORT=8000
   
   # Database
   mongodbUri=mongodb://localhost:27017/marketkit
   
   # Better Auth
   BETTER_AUTH_SECRET=your-secret-key-here
   
   # OAuth Providers (optional - for social auth)
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   FACEBOOK_CLIENT_ID=your-facebook-client-id
   FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
   
   # Email Configuration (optional - for email verification and password reset)
   EMAIL_USER=your-email@example.com
   EMAIL_PASS=your-email-password
   # For development/testing, you can use MailHog or MailCatcher on localhost:1025
   
   # App URL
   APP_URL=http://localhost:8000
   ```

4. **Configure Email Service (Optional)**
   
   The project uses Nodemailer for sending emails. Configure your SMTP settings in `src/config/email.js`:
   
   **For Gmail:**
   ```javascript
   service: "gmail",
   auth: {
       user: process.env.EMAIL_USER,
       pass: process.env.EMAIL_PASS
   }
   ```
   
   **For SendGrid:**
   ```javascript
   host: "smtp.sendgrid.net",
   port: 587,
   auth: {
       user: "apikey",
       pass: process.env.SENDGRID_API_KEY
   }
   ```
   
   **For Mailgun:**
   ```javascript
   host: "smtp.mailgun.org",
   port: 587,
   auth: {
       user: process.env.MAILGUN_USER,
       pass: process.env.MAILGUN_PASS
   }
   ```

5. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

6. **Run the application**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

7. **Access the application**
   ```
   http://localhost:8000
   ```

## Usage

### Customer Features

1. **Browse Products**
   - Visit homepage to see featured products
   - Use the shop page to browse all products
   - Filter by category using the sidebar or navbar dropdown
   - Search for specific products using the search bar
   - Apply price range and stock filters
   - Sort products by various criteria

2. **Shopping Cart**
   - Click the cart icon in the navbar to open the cart drawer
   - Add products to cart from product listing or detail pages
   - Adjust quantities or remove items
   - View subtotal and shipping costs
   - Free shipping on orders over $50

3. **Checkout**
   - Click "Proceed to Checkout" from cart
   - Enter shipping address and phone number
   - Add optional order notes
   - Place order

4. **Order Management**
   - View order history in "My Orders"
   - Click on individual orders to see details
   - Track order status (pending, processing, shipped, delivered)

5. **Account Management**
   - Register for a new account
   - Verify email address before accessing account features
   - Login with email/password or social accounts
   - Request password reset via email
   - Update profile information
   - Change email (requires email confirmation)
   - Change password
   - View order history

### Admin Features

1. **Access Admin Panel**
   - Login with an admin account
   - Click "Admin" in the user dropdown menu

2. **Product Management**
   - View all products
   - Add new products with images
   - Edit existing products
   - Delete products
   - Manage product categories, prices, stock, and discounts

3. **User Management**
   - View all registered users
   - Search users by name or email
   - Change user roles (admin/user)
   - Ban/unban users
   - Delete users

## API Routes

### Public Routes
- `GET /` - Homepage
- `GET /products` - Product catalog
- `GET /products/:id/details` - Product detail
- `GET /products/categories/:category` - Products by category
- `GET /products/search` - Search products
- `GET /newsletter/subscribe` - Newsletter subscription

### User Routes (require authentication)
- `GET /users/dashboard` - User dashboard
- `GET /users/profile` - User profile
- `GET /users/forgot` - Forgot password page
- `POST /users/forgot` - Send password reset email
- `GET /users/reset` - Reset password page
- `POST /users/reset` - Reset password
- `GET /users/change-email` - Change email page
- `POST /users/change-email` - Change email
- `GET /users/change-password` - Change password page
- `POST /users/change-password` - Change password
- `POST /users/logout` - Logout
- `GET /users/orders` - Order history
- `GET /users/orders/:id` - Order detail

### Cart Routes (require authentication)
- `GET /products/cart/items` - View cart (HTML page or JSON for AJAX)
- `POST /products/cart/add` - Add item to cart
- `POST /products/cart/update/:itemId` - Update cart item
- `POST /products/cart/remove/:itemId` - Remove cart item
- `POST /products/cart/clear` - Clear cart

### Checkout Routes (require authentication)
- `GET /products/checkout` - Checkout page
- `POST /products/checkout` - Place order

### Admin Routes (require admin role)
- `GET /admin` - Admin dashboard
- `GET /admin/products` - Product management
- `POST /admin/products` - Create product
- `PUT /admin/products/:id` - Update product
- `DELETE /admin/products/:id` - Delete product
- `GET /admin/users` - User management
- `POST /admin/users/:id/set-role` - Change user role
- `POST /admin/users/:id/ban` - Ban user
- `POST /admin/users/:id/unban` - Unban user
- `DELETE /admin/users/:id` - Delete user

### Better Auth API Routes
- `POST /api/auth/sign-up/email` - Email registration
- `POST /api/auth/sign-in/email` - Email login
- `POST /api/auth/sign-in/social` - Social login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/verify-email` - Verify email address
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-email` - Change email address
- `GET /api/auth/get-session` - Get current session

## Template System

The project uses Miki Template Engine with Django-like syntax:

```html
{% extends 'base.html' %}

{% block title %}
  Page Title | {{ block.super }}
{% endblock %}

{% block content %}
  <!-- Page content here -->
{% endblock %}

{% block scripts %}
  <!-- Page-specific JavaScript -->
{% endblock %}
```

### Available Template Tags
- `{% extends 'template.html' %}` - Inherit from base template
- `{% block name %}...{% endblock %}` - Define/override blocks
- `{% if condition %}...{% endif %}` - Conditional rendering
- `{% for item in items %}...{% endfor %}` - Loop through items
- `{{ variable }}` - Output variable
- `{{ variable|filter }}` - Apply filters (e.g., `|upper`, `|truncatechars`)

## Database Models

### User
- id, name, email, emailVerified, image, createdAt, updatedAt
- Managed by Better Auth

### Product
- name, description, price, discount, stock, category
- images (array of file paths)
- isAvailable (boolean)
- createdAt, updatedAt
- Virtual fields: `discountedPrice`, `primaryImage`

### Cart
- user (reference to User)
- items (array of CartItems)
- createdAt, updatedAt

### CartItem
- product (reference to Product)
- quantity
- priceAtTime
- Virtual method: `getItemTotal()`

### Order
- user (reference to User)
- items (array of OrderItems)
- total, status, shippingAddress, phone, notes
- createdAt, updatedAt

### OrderItem
- product (reference to Product)
- quantity
- priceAtTime
- Virtual method: `getItemTotal()`

### Newsletter
- email (unique)
- isActive
- createdAt

## Middleware

### attachUser
Attaches the authenticated user to every request:
- `req.user` - User object or null
- `req.sessionData` - Session object or null
- `res.locals.user` - Available in templates

### attachCartCount
Attaches cart item count to every request:
- `res.locals.cartCount` - Total quantity of items in cart

### loginRequired
Protects routes that require authentication:
- Redirects to login if not authenticated

### adminRequired
Protects admin routes:
- Checks for admin role
- Returns 403 if not authorized

## File Uploads

Product images are uploaded using Multer:
- **Storage**: `/media/uploads/`
- **Max files**: 8 per product
- **Max size**: 5MB per file
- **Allowed formats**: Configured in multer.js

## Security Features

- Helmet.js for security headers
- HttpOnly cookies for session management
- CSRF protection via Better Auth
- Secure cookie attributes in production
- Input validation and sanitization
- MongoDB injection prevention via Mongoose
- Admin role-based access control

## Deployment

1. Set `NODE_ENV=production` in `.env`
2. Configure production MongoDB URI
3. Set secure `BETTER_AUTH_SECRET`
4. Configure OAuth provider URLs for production domain
5. Configure production email service (SMTP) in `src/config/email.js`
6. Build and start:
   ```bash
   npm start
   ```

## Development

The project uses ES6 modules (import/export). Make sure your Node.js version supports it (v14+).

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload (if configured)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
