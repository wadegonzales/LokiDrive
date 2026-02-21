require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_TOKEN = process.env.SECRET_TOKEN || 'change-this-secret-token';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// SQLite setup
const db = new Database(path.join(__dirname, 'drive.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    uploaded_at TEXT DEFAULT (datetime('now'))
  )
`);

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB max
});

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['x-token'] || req.query.token;
  if (token !== SECRET_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Upload file(s)
app.post('/api/upload', auth, upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const inserted = [];
  const insertStmt = db.prepare(`
    INSERT INTO files (id, original_name, stored_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const file of req.files) {
    const id = crypto.randomUUID();
    insertStmt.run(id, file.originalname, file.filename, file.mimetype, file.size);
    inserted.push({ id, name: file.originalname, size: file.size });
  }

  res.json({ success: true, files: inserted });
});

// List files
app.get('/api/files', auth, (req, res) => {
  const files = db.prepare('SELECT * FROM files ORDER BY uploaded_at DESC').all();
  res.json(files);
});

// Download file
app.get('/api/download/:id', auth, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(UPLOAD_DIR, file.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.sendFile(filePath);
});

// Delete file
app.delete('/api/files/:id', auth, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(UPLOAD_DIR, file.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Storage stats
app.get('/api/stats', auth, (req, res) => {
  const stats = db.prepare('SELECT COUNT(*) as count, SUM(size) as total_size FROM files').get();
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`✅ MyDrive running at http://localhost:${PORT}`);
  console.log(`🔑 Token: ${SECRET_TOKEN}`);
});
