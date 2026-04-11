const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readRecords, writeRecords } = require('../utils/fileHandler');

const AUDIT_PATH   = path.join(__dirname, '..', 'data', 'audit_logs.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Append one audit event to the flat log file.
 * @param {object} event  { action, actor, actorType, patientAddress, patientId, details }
 */
const appendAuditLog = async (event) => {
  const logs  = await readRecords(AUDIT_PATH);
  const entry = {
    id:             `AUDIT-${uuidv4()}`,
    action:         event.action         || 'UNKNOWN',
    actor:          event.actor          || 'system',
    actorType:      event.actorType      || 'system',   // patient | doctor | insurer | system
    patientAddress: event.patientAddress || null,
    patientId:      event.patientId      || null,
    details:        event.details        || {},
    timestamp:      new Date().toISOString(),
  };
  logs.push(entry);
  await writeRecords(AUDIT_PATH, logs);
  return entry;
};

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/audit
 * Query params: patientAddress | patientId | limit (default 50)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { patientAddress, patientId, limit = 50 } = req.query || {};
    const all = await readRecords(AUDIT_PATH);

    let filtered = all.filter(e => {
      if (patientAddress && e.patientAddress !== patientAddress) return false;
      if (patientId      && e.patientId      !== patientId)      return false;
      return true;
    });

    // Newest first
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Respect limit
    const maxItems = Math.min(Number(limit) || 50, 200);
    filtered = filtered.slice(0, maxItems);

    res.status(200).json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs, appendAuditLog };
