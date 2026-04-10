const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readRecords, writeRecords } = require('../utils/fileHandler');

const recordsFile = path.join(__dirname, '../data/records.json');

// @desc    Upload a new medical record
// @route   POST /api/records/upload
// @access  Public
const uploadRecord = async (req, res, next) => {
  try {
    let { patientName } = req.body;
    
    // Validate inputs strictly
    if (!patientName || typeof patientName !== 'string' || patientName.trim() === '') {
      res.status(400);
      throw new Error('Please provide a valid patientName');
    }

    // Sanitize input against basic HTML tags/injection
    patientName = patientName.trim().replace(/[<>]/g, '');
    
    // Ensure file was provided (assuming multer middleware is in route)
    if (!req.file) {
      res.status(400);
      throw new Error('Please append a file to upload');
    }

    // Generate secure access UUID
    const accessId = uuidv4();

    // Construct the new record
    const newRecord = {
      internalId: uuidv4(),
      accessId,
      patientName,
      filePath: req.file.path.replace(/\\/g, '/'), // normalizing path 
      fileName: req.file.originalname,
      createdAt: new Date().toISOString()
    };

    // Safely retrieve existing records and append the new one
    const records = await readRecords(recordsFile);
    records.push(newRecord);

    // Save updated records array back to JSON safely
    await writeRecords(recordsFile, records);

    res.status(201).json({
      success: true,
      message: 'Record successfully uploaded',
      data: {
        accessId: newRecord.accessId,
        patientName: newRecord.patientName,
        createdAt: newRecord.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get record by valid accessId
// @route   GET /api/records/:accessId
// @access  Public
const getRecord = async (req, res, next) => {
  try {
    const { accessId } = req.params;

    if (!accessId) {
      res.status(400);
      throw new Error('Please provide an accessId parameter');
    }

    // Retrieve all records for scanning
    const records = await readRecords(recordsFile);
    
    const record = records.find(r => r.accessId === accessId);

    if (!record) {
      res.status(404);
      throw new Error('Record not found or invalid access ID');
    }

    // Check expiration - max 10 minutes lifespan
    const recordTimestamp = new Date(record.createdAt).getTime();
    const currentTime = Date.now();
    const expiryLimit = 10 * 60 * 1000; // 10 minutes in milliseconds

    if (currentTime - recordTimestamp > expiryLimit) {
      res.status(410); // HTTP 410 Gone properly signifies an expired resource
      throw new Error('Link expired');
    }

    res.status(200).json({
      success: true,
      data: record
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadRecord,
  getRecord
};
