const express = require('express');
const router = express.Router();
const { getIndex } = require('../controllers/indexController');

router.route('/').get(getIndex);

module.exports = router;
