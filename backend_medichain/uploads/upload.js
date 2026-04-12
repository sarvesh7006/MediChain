const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Automatically ensure the uploads directory exists synchronously 
// so multer doesn't crash on the initial startup.
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Extract original extension
    const ext = path.extname(file.originalname);
    // Rename file with a timestamp and the original extension
    const timestamp = Date.now();
    cb(null, `${timestamp}${ext}`);
  }
});

// File Filter Configuration
const fileFilter = (req, file, cb) => {
  // Check if the mimetype starts with "image/" or is strictly "application/pdf"
  if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1048576 // 1 MB limit
  }
});

module.exports = upload;
