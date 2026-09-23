import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Ensure the upload directory exists.
 * Creates the directory recursively if it doesn't exist.
 */
const UPLOAD_DIR = path.join(process.cwd(), "src", "media", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Multer disk storage configuration.
 * Generates a unique filename using the current timestamp and a random suffix
 * to prevent filename collisions and overwrites.
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + "-" + uniquePrefix + ext);
  },
});

/**
 * File filter function to restrict uploads to image files only.
 * Allows: JPEG, PNG, GIF, WebP.
 */
function fileFilter(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  const isValid = allowedTypes.test(ext);

  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"), false);
  }
}

/**
 * Configured multer instance for single file uploads.
 * Usage: upload.single("avatar")
 * File size limit: 5MB
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;
