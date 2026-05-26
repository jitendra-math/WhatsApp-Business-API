import MessageLog from '../models/MessageLog.js';
import { Parser } from 'json2csv';

export const exportMessageLogsCSV = async (req, res) => {
  try {
    // MongoDB se saare logs nikal lo, latest wale pehle (descending order)
    const logs = await MessageLog.find().sort({ timestamp: -1 }).lean();

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No message logs found to export.'
      });
    }

    // CSV ke columns define karo
    const fields = [
      '_id', 
      'type', 
      'number', 
      'message', 
      'status', 
      'errorReason', 
      'whatsappMessageId', 
      'timestamp'
    ];
    
    // JSON data ko CSV string mein convert karo
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(logs);

    // Headers set karo taaki browser seedha file download kare
    res.header('Content-Type', 'text/csv');
    res.attachment('whatsapp-audit-logs.csv');
    
    // CSV file return kar do
    return res.send(csv);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate CSV export.'
    });
  }
};
