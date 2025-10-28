import transcriptGenerationService from '../Service/transcriptGenerationService';

let generateTranscript = async (req, res) => {
    let filename = req.body.filename;
    let messageData = await handleGenerateTranscript(filename);
    return res.status(200).json({
        message: messageData.errMessage,
        messageData: messageData.data ? messageData.data : {}
    });
}

module.exports = {
    generateTranscript: generateTranscript
}
