// @desc    Get index API status
// @route   GET /
// @access  Public
const getIndex = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running successfully',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getIndex
};
