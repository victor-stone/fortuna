import { handleUploadedFiles } from "../import.js";
import multer from "multer";
import fs from "fs";
import path from "path";


const allowedMimeTypes = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/json",
  // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // "application/vnd.ms-powerpoint",
  // "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // "application/msword",
  // "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // "text/plain",
]);

export default function importer(app, _dirname) {

  const _uploadsDir = path.join(_dirname, "uploads");
  if (!fs.existsSync(_uploadsDir)) {
    fs.mkdirSync(_uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, _uploadsDir);
    },
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${timestamp}-${sanitized}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Unsupported file type: " + file.mimetype));
      }
    },
  });

  app.post("/api/import/files", upload.any(), async (req, res) => {
    try {
      const files = req.files ?? [];
      if (!files.length) {
        return res.status(400).json({ error: "No files received" });
      }

      const log         = [];
      const previewOnly = req.body?.preview === 'true';
      const results     = await handleUploadedFiles(files, log, previewOnly);

      return res.status(201).json({
        message: "Files uploaded successfully",
        results,
        log
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: error.message });
    }
  });
}
