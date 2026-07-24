const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, password_hash, role, verification_status')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      fullName: user.full_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      verificationStatus: user.verification_status,
    },
  });
}

async function me(req, res) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, verification_status')
    .eq('id', req.user.id)
    .single();

  if (error || !user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      verificationStatus: user.verification_status,
    },
  });
}

module.exports = {
  login,
  me,
};
