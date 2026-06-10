import ScheduledMessage from '../models/ScheduledMessage.js';
import { getClient } from '../services/whatsappClient.js';
import MessageLog from '../models/MessageLog.js';

// Helper: Validate future time
const isFutureTime = (inputDate) => {
  const now = new Date();
  return new Date(inputDate) > now;
};

// POST /api/schedule/create
export const createSchedule = async (req, res) => {
  try {
    const { number, message, scheduledTime, repeat } = req.body;

    if (!number || !message || !scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'number, message, and scheduledTime are required'
      });
    }

    if (!isFutureTime(scheduledTime)) {
      return res.status(400).json({
        success: false,
        error: 'scheduledTime must be in the future'
      });
    }

    const validRepeats = [null, 'daily', 'weekly'];
    if (repeat && !validRepeats.includes(repeat)) {
      return res.status(400).json({
        success: false,
        error: 'repeat must be null, "daily", or "weekly"'
      });
    }

    const schedule = await ScheduledMessage.create({
      number,
      message,
      scheduledTime: new Date(scheduledTime),
      repeat: repeat || null,
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      data: schedule,
      message: 'Scheduled message created successfully'
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/schedule/list
export const listSchedules = async (req, res) => {
  try {
    const schedules = await ScheduledMessage.find({ status: 'pending' })
      .sort({ scheduledTime: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('List schedules error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/schedule/:id
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduledMessage.findById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    if (schedule.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot delete schedule with status: ${schedule.status}`
      });
    }

    schedule.status = 'cancelled';
    await schedule.save();

    return res.status(200).json({
      success: true,
      message: 'Schedule cancelled successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Internal function (used by scheduler) – not exposed via API
export const executeSend = async (scheduleDoc) => {
  const client = getClient();
  if (!client) {
    throw new Error('WhatsApp client not ready');
  }

  const formattedNumber = `${scheduleDoc.number}@s.whatsapp.net`;
  try {
    const response = await client.sendMessage(formattedNumber, { text: scheduleDoc.message });

    // Log success in MessageLog
    await MessageLog.create({
      type: 'outgoing',
      number: scheduleDoc.number,
      message: `[SCHEDULED] ${scheduleDoc.message}`,
      status: 'sent',
      whatsappMessageId: response?.key?.id || 'unknown'
    });

    return { success: true, response };
  } catch (sendError) {
    // Log failure
    await MessageLog.create({
      type: 'outgoing',
      number: scheduleDoc.number,
      message: `[SCHEDULED FAILED] ${scheduleDoc.message}`,
      status: 'failed',
      errorReason: sendError.message
    });
    throw sendError;
  }
};