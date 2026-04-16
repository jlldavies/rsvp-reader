import multer from 'multer';

// Store files in memory — max 50MB
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
