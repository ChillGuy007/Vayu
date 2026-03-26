async function sendSmsToContacts(contacts, { body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!contacts.length) {
    return { enabled: false, sent: 0, skipped: 0, reason: 'No contacts found' };
  }

  if (!sid || !token || !from) {
    return {
      enabled: false,
      sent: 0,
      skipped: contacts.length,
      reason: 'Twilio env vars not configured'
    };
  }

  let twilio;
  try {
    twilio = require('twilio');
  } catch (_error) {
    return {
      enabled: false,
      sent: 0,
      skipped: contacts.length,
      reason: 'Twilio package not available'
    };
  }

  const client = twilio(sid, token);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    contacts.map(async (contact) => {
      try {
        await client.messages.create({
          body,
          from,
          to: contact.phone
        });
        sent += 1;
      } catch (_error) {
        failed += 1;
      }
    })
  );

  return {
    enabled: true,
    sent,
    failed
  };
}

module.exports = {
  sendSmsToContacts
};
