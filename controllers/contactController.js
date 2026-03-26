const { addContact, listContacts } = require('../models/contactModel');

async function getContacts(req, res) {
  try {
    const contacts = await listContacts(req.user.userId);
    return res.json({ count: contacts.length, contacts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createContact(req, res) {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const contact = await addContact(req.user.userId, name, phone);
    return res.status(201).json(contact);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getContacts,
  createContact
};
