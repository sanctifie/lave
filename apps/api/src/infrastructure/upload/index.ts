import multer from 'multer';
import { randomUUID } from 'crypto';

// L'extension est dérivée du mimetype validé côté serveur, jamais du nom de
// fichier fourni par le client : un nom comme « ordonnance.html » avec un
// mimetype image ne doit pas produire un fichier .html servi tel quel
// (risque de XSS stockée quand /uploads est ouvert dans un navigateur).
const MIMETYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const ext = MIMETYPE_TO_EXT[file.mimetype] ?? '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (MIMETYPE_TO_EXT[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou PDF.'));
    }
  },
});
