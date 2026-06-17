import { getClient } from './whatsappClient.js';
import MessageLog from '../models/MessageLog.js';

const sendMessageToNumber = async (number, text, source = 'api') => {
  const client = getClient();
  if (!client) {
    throw new Error('WhatsApp client not ready');
  }

  const formattedNumber = `${number}@s.whatsapp.net`;
  const response = await client.sendMessage(formattedNumber, { text });

  await MessageLog.create({
    type: 'outgoing',
    number,
    message: text,
    status: 'sent',
    whatsappMessageId: response?.key?.id || 'unknown'
  });

  return response;
};

const sendScheduledMessage = async (scheduleDoc) => {
  const { number, message, _id } = scheduleDoc;
  const client = getClient();
  if (!client) {
    throw new Error('WhatsApp client not ready');
  }

  const formattedNumber = `${number}@s.whatsapp.net`;
  try {
    const response = await client.sendMessage(formattedNumber, { text: message });

    await MessageLog.create({
      type: 'outgoing',
      number,
      message: `[SCHEDULED] ${message}`,
      status: 'sent',
      whatsappMessageId: response?.key?.id || 'unknown'
    });

    return { success: true, response };
  } catch (sendError) {
    await MessageLog.create({
      type: 'outgoing',
      number,
      message: `[SCHEDULED FAILED] ${message}`,
      status: 'failed',
      errorReason: sendError.message
    });
    throw sendError;
  }
};

export { sendMessageToNumber, sendScheduledMessage };