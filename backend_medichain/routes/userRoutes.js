const express = require('express');
const router = express.Router();
const { registerPatient, getPatientById } = require('../controllers/patientController');

router.post('/patients', registerPatient);
router.get('/patients/:patientId', getPatientById);

module.exports = router;

