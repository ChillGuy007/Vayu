const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail } = require('../models/userModel');

function signToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email
    },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: '7d' }
  );
}

async function register(req, res) {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash, fullName });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  register,
  login
};
