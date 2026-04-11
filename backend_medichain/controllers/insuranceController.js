const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readRecords, writeRecords } = require('../utils/fileHandler');
const { appendAuditLog } = require('./auditController');

const CLAIMS_PATH  = path.join(__dirname, '..', 'data', 'claims.json');
const RECORDS_PATH = path.join(__dirname, '..', 'data', 'records.json');

// @desc  Submit an Insurance Claim
// @route POST /api/v1/insurance/submit
const submitClaim = async (req, res, next) => {
  try {
    const {
      patientId,
      patientAddress,
      recordId,
      recordTitle,
      treatment,
      provider,
      totalExpense,
      coveragePct,
      insurerName,
      notes,
    } = req.body || {};

    if (!patientId && !patientAddress) {
      return res.status(400).json({ success: false, message: 'patientId or patientAddress is required' });
    }
    if (!recordId) {
      return res.status(400).json({ success: false, message: 'recordId is required' });
    }

    const claimId = 'CLM-' + uuidv4();
    const now     = new Date().toISOString();

    const copayAmount = totalExpense && coveragePct
      ? (totalExpense * (1 - coveragePct / 100)).toFixed(2)
      : null;

    const claim = {
      claimId,
      patientId:      patientId || null,
      patientAddress: patientAddress || null,
      recordId,
      recordTitle:    recordTitle  || 'Medical Record',
      treatment:      treatment    || '',
      provider:       provider     || '',
      totalExpense:   totalExpense ? Number(totalExpense) : null,
      coveragePct:    coveragePct  ? Number(coveragePct)  : null,
      copayAmount:    copayAmount  ? Number(copayAmount)   : null,
      insurerName:    insurerName  || '',
      notes:          notes        || '',
      status:         'submitted',
      submittedAt:    now,
      updatedAt:      now,
    };

    const claims = await readRecords(CLAIMS_PATH);
    claims.push(claim);
    await writeRecords(CLAIMS_PATH, claims);

    await appendAuditLog({
      action:         'INSURANCE_CLAIM',
      actor:          patientId || patientAddress || 'patient',
      actorType:      'patient',
      patientAddress: patientAddress || null,
      patientId:      patientId      || null,
      details: {
        claimId,
        recordId,
        recordTitle: recordTitle || 'Medical Record',
        treatment:   treatment   || '',
        totalExpense,
        copayAmount,
        status:      'submitted',
      },
    });

    res.status(201).json({ success: true, message: 'Claim submitted successfully', data: claim });
  } catch (error) {
    next(error);
  }
};

// @desc  List claims for a patient
// @route GET /api/v1/insurance/claims
const listClaims = async (req, res, next) => {
  try {
    const { patientId, patientAddress } = req.query || {};
    const claims = await readRecords(CLAIMS_PATH);

    const filtered = claims.filter(c => {
      if (patientId      && c.patientId      !== patientId)      return false;
      if (patientAddress && c.patientAddress !== patientAddress) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.status(200).json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    next(error);
  }
};

// @desc  Approve / reject a claim
// @route POST /api/v1/insurance/claims/:claimId/decision
const decideClaimStatus = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { action }  = req.body || {};  // 'verify' | 'approve' | 'reject'
    if (!['verify', 'approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be verify, approve, or reject' });
    }
    const claims = await readRecords(CLAIMS_PATH);
    const idx    = claims.findIndex(c => c.claimId === claimId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Claim not found' });

    if (action === 'verify')  claims[idx].status = 'verified';
    if (action === 'approve') claims[idx].status = 'approved';
    if (action === 'reject')  claims[idx].status = 'rejected';
    claims[idx].updatedAt = new Date().toISOString();
    await writeRecords(CLAIMS_PATH, claims);

    res.status(200).json({ success: true, data: claims[idx] });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitClaim, listClaims, decideClaimStatus };
