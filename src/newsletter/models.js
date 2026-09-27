import mongoose, { Schema, model } from 'mongoose';

const newsletterSchema = new Schema({
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Newsletter = model('Newsletter', newsletterSchema);

export default Newsletter;
