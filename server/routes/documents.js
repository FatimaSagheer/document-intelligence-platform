const router = require('express').Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const { processDocument } = require('../rag/pipeline');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'text/plain'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
  }
});

// POST /api/documents/upload
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    // 1. Upload to Supabase Storage
    const filePath = `${req.user.id}/${Date.now()}_${file.originalname}`;
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (storageError) return res.status(500).json({ error: storageError.message });

    // 2. Save record to documents table
    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: req.user.id,
        filename: file.originalname,
        storage_url: filePath,
        status: 'processing',
      })
      .select()
      .single();

    if (dbError) return res.status(500).json({ error: dbError.message });

    // 3. Respond immediately — RAG pipeline runs after
    res.json({ document: doc });

    // 4. Trigger RAG pipeline in background (non-blocking)
    processDocument(doc.id, file.buffer, file.mimetype, req.user.id);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents — list user's documents
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ documents: data });
});

// // Placeholder — replace with real RAG pipeline in Phase 2
// async function processDocument(docId, buffer, mimetype, userId) {
//   console.log(`Processing doc ${docId} for user ${userId}`);
//   // TODO: extract text → chunk → embed → store in pgvector
//   // For now just mark as ready after 2 seconds
//   setTimeout(async () => {
//     await supabase.from('documents')
//       .update({ status: 'ready' })
//       .eq('id', docId);
//     console.log(`Doc ${docId} marked ready`);
//   }, 2000);
// }

module.exports = router;