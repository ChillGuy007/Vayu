const express = require('express');
const authenticate = require('../middleware/authenticate');
const { getContacts, createContact } = require('../controllers/contactController');

const router = express.Router();

router.get('/contacts', authenticate, getContacts);
router.post('/contacts', authenticate, createContact);

module.exports = router;
