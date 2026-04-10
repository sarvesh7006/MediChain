const express = require('express');
const router = express.Router();

// Import controller logic
const { uploadRecord, getRecord } = require('../controllers/recordController');

// Import upload middleware
const upload = require('../uploads/upload');

// @route   POST /upload
// @desc    Upload a record via multer middleware
// @access  Public
router.post('/upload', upload.single('file'), uploadRecord);

// @route   GET /:accessId
// @desc    Get record by valid accessId
// @access  Public
router.get('/:accessId', getRecord);

module.exports = router;
