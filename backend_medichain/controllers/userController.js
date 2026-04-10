const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Public
const createUser = async (req, res, next) => {
  try {
    let { name, role } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '' || 
        !role || typeof role !== 'string' || role.trim() === '') {
      res.status(400);
      throw new Error('Please provide a valid name and role');
    }

    // Sanitize input against basic HTML tags/injection
    name = name.trim().replace(/[<>]/g, '');
    role = role.trim().replace(/[<>]/g, '');

    const user = await User.create({ name, role });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser
};
