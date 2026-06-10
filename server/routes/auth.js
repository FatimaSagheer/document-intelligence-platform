const router = require('express').Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// REGISTER
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.admin
    .createUser({ email, password, email_confirm: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'User created', user: data.user });
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth
    .signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  const token = jwt.sign(
    { id: data.user.id, email: data.user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: data.user });
});

// GET CURRENT USER
router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({ user: req.user });
});


router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
}); 
module.exports = router;