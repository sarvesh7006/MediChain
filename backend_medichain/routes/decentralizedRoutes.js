const express = require('express');
const multer = require('multer');
const { param } = require('express-validator');
const { uploadData } = require('../controllers/uploadController');
const { getAllRecords, verifyRecord } = require('../controllers/verifyController');
const { updateProfile, getProfile } = require('../controllers/userController');
const { grantEmergencyAccess } = require('../controllers/emergencyController');
const { submitClaim, listClaims, decideClaimStatus } = require('../controllers/insuranceController');
// Updated controllers
const { createRequest, listRequests, decideRequest } = require('../controllers/requestController');
const { getAuditLogs } = require('../controllers/auditController');

const router = express.Router();

// Setup Multer for handling file uploads in memory for IPFS
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==============================
// 1. ORIGINAL RECORD FLOW
// ==============================
router.post('/upload', upload.single('document'), uploadData);
router.get('/records', getAllRecords);
router.get('/verify/:id', [
    param('id').notEmpty().withMessage('Record ID is required').isString()
  ], verifyRecord);

// ==============================
// 2. PATIENT PROFILE FLOW
// ==============================
router.post('/profile', updateProfile);
router.get('/profile/:address', getProfile);

// ==============================
// 3. EMERGENCY QR SCAN FLOW
// ==============================
router.post('/emergency-access', grantEmergencyAccess);

// ==============================
// 4. SECURE INSURANCE FLOW
// ==============================
router.post('/insurance/submit', submitClaim);
router.get('/insurance/claims', listClaims);
router.post('/insurance/claims/:claimId/decision', decideClaimStatus);

// ==============================
// 5. ACCESS REQUEST FLOW
// ==============================
router.post('/requests', createRequest);
router.get('/requests', listRequests);
router.post('/requests/:id/decision', decideRequest);

// ==============================
// 6. AUDIT LOG FLOW
// ==============================
router.get('/audit', getAuditLogs);

module.exports = router;
