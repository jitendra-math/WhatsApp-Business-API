import ButtonResponse from '../models/ButtonResponse.js';

// Create or update button response (upsert)
export const upsertButtonResponse = async (req, res) => {
    try {
        const { buttonId, responseMessage } = req.body;

        if (!buttonId || !responseMessage) {
            return res.status(400).json({
                success: false,
                error: 'buttonId and responseMessage are required'
            });
        }

        const updated = await ButtonResponse.findOneAndUpdate(
            { buttonId },
            { responseMessage, updatedAt: Date.now() },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Button response saved successfully',
            data: updated
        });
    } catch (error) {
        console.error('Upsert button response error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get single button response by buttonId
export const getButtonResponse = async (req, res) => {
    try {
        const { buttonId } = req.params;

        const doc = await ButtonResponse.findOne({ buttonId });
        if (!doc) {
            return res.status(404).json({
                success: false,
                error: 'Button response not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: doc
        });
    } catch (error) {
        console.error('Get button response error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// List all button responses
export const listButtonResponses = async (req, res) => {
    try {
        const docs = await ButtonResponse.find().sort({ buttonId: 1 });
        return res.status(200).json({
            success: true,
            count: docs.length,
            data: docs
        });
    } catch (error) {
        console.error('List button responses error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete a button response
export const deleteButtonResponse = async (req, res) => {
    try {
        const { buttonId } = req.params;

        const deleted = await ButtonResponse.findOneAndDelete({ buttonId });
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Button response not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Button response deleted successfully'
        });
    } catch (error) {
        console.error('Delete button response error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};