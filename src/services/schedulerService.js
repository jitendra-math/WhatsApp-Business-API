import cron from 'node-cron';
import ScheduledMessage from '../models/ScheduledMessage.js';
import { executeSend } from '../controllers/scheduleController.js';
import { getClientStatus } from './whatsappClient.js';

let isRunning = false;

// Function to process due schedules
const processDueSchedules = async () => {
  // Prevent overlapping runs
  if (isRunning) {
    console.log('Scheduler: Previous run still in progress, skipping...');
    return;
  }

  isRunning = true;
  try {
    // Only process if WhatsApp client is ready
    const status = getClientStatus();
    if (status !== 'READY') {
      console.log(`Scheduler: Client not ready (status: ${status}), skipping...`);
      return;
    }

    const now = new Date();
    const dueSchedules = await ScheduledMessage.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    });

    if (dueSchedules.length === 0) return;

    console.log(`Scheduler: Found ${dueSchedules.length} due schedule(s).`);

    for (const schedule of dueSchedules) {
      try {
        // Attempt to send message
        await executeSend(schedule);

        // If repeat is set, calculate next run
        if (schedule.repeat) {
          let nextTime = new Date(schedule.scheduledTime);
          if (schedule.repeat === 'daily') {
            nextTime.setDate(nextTime.getDate() + 1);
          } else if (schedule.repeat === 'weekly') {
            nextTime.setDate(nextTime.getDate() + 7);
          }

          // Update the schedule for next run
          schedule.scheduledTime = nextTime;
          schedule.lastAttempt = now;
          schedule.errorReason = null;
          await schedule.save();
          console.log(`Scheduler: Rescheduled ${schedule._id} to ${nextTime.toISOString()}`);
        } else {
          // One-time schedule: mark as completed
          schedule.status = 'completed';
          schedule.lastAttempt = now;
          await schedule.save();
          console.log(`Scheduler: Completed schedule ${schedule._id}`);
        }
      } catch (err) {
        console.error(`Scheduler: Failed to send schedule ${schedule._id}:`, err.message);
        schedule.status = 'failed';
        schedule.errorReason = err.message;
        schedule.lastAttempt = now;
        await schedule.save();
      }
    }
  } catch (error) {
    console.error('Scheduler: Critical error in processDueSchedules:', error);
  } finally {
    isRunning = false;
  }
};

// Start the scheduler (call this from server.js after DB connection)
export const startScheduler = () => {
  // Run every minute
  cron.schedule('* * * * *', () => {
    console.log('Scheduler: Checking for due messages...');
    processDueSchedules();
  });
  console.log('Scheduler started – checking every minute.');
};