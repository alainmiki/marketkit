import mongoose, { Schema } from 'mongoose';
import dotenv from "dotenv";
dotenv.config();

/**
 * Legacy User model for custom user data not handled by better-auth.
 * 
 * Note: Authentication, session, email, username, and avatar (image) are managed
 * by better-auth and stored in its own collections. This model is intended for
 * additional application-specific user metadata only.
 * 
 * @deprecated Prefer using better-auth's user API (auth.api.updateUser) for user data.
 * This model is kept for backward compatibility with any code that queries it directly.
 */
const UserSchema = new Schema({
    username: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
}, { timestamps: true });

UserSchema.methods.getUsername = function () {
    return this.username;
};

const User = mongoose.model('User', UserSchema);

export default User;
