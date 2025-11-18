import path from 'path';

const uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file provided' 
      });
    }

    const { userId, chatId, room, timestamp } = req.body;
    
    // Return the filename and metadata
    res.json({ 
      success: true, 
      message: 'Recording saved successfully',
      filename: req.file.filename,
      localPath: req.file.path,
      metadata: {
        userId,
        chatId: chatId || null,
        room,
        timestamp,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload recording error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export default {
  uploadRecording
};
