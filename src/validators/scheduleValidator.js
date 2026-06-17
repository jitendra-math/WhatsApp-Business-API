import Joi from 'joi';

const createScheduleSchema = Joi.object({
  number: Joi.string().required(),
  message: Joi.string().required(),
  scheduledTime: Joi.date().iso().greater('now').required(),
  repeat: Joi.string().valid(null, 'daily', 'weekly').optional()
});

const validateCreateSchedule = (data) => {
  return createScheduleSchema.validate(data);
};

export { validateCreateSchedule };