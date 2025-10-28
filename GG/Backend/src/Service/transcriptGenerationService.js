import whisper from 'whisper-node';

let handleGenerateTranscript = (filename) => {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await whisper(filename, {
                model: "./models/ggml-base.en.bin",
                autoDownloadModel: false,
            });
            let message = {};
            message.errMessage = 'Transcript successfully created';
            message.data = result;
            resolve(message);
        } catch (e) {
            console.error(`Error generating transcript from video with filename ${filename}`, e);
            reject(e);
        }
    })
}
