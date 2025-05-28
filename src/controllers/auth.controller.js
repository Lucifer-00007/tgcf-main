const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const jwtConfig = require('../config/jwt.config');

// Login function
exports.login = async (req, res) => {
  try {
    // Input validation
    if (!req.body.emailOrUsername || !req.body.password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    const { emailOrUsername, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email/username or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn || '1h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user (protected route)
exports.getMe = async (req, res) => {
  try {
    // User is attached to req.user by the protect middleware
    const user = await User.findById(req.user.id).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Placeholder for register function
exports.register = async (req, res) => {
  res.status(501).json({ message: 'Not Implemented' });
};
