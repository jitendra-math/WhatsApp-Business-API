import Joi from 'joi';

const sendMessageSchema = Joi.object({
  number: Joi.string().required(),
  message: Joi.string().required()
});

const validateSendMessage = (data) => {
  return sendMessageSchema.validate(data);
};

export { validateSendMessage };