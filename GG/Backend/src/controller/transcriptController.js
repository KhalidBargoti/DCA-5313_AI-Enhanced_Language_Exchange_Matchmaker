import { handleGenerateTranscript } from '../Service/transcriptGenerationService.js';

let generateTranscript = async (req, res) => {
    let filename = req.params.filename;
    let messageData = await handleGenerateTranscript(filename);
    return res.status(200).json({
        message: messageData.errMessage,
        messageData: messageData.data ? messageData.data : {}
    });
}

const transcriptController = {
  generateTranscript
};

export default transcriptController;
