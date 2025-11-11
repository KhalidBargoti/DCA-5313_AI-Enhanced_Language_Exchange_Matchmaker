const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");

const whisperBaseLocation = path.resolve("whisper.cpp");
const { whisper } = require(path.join(whisperBaseLocation, "build/Release/addon.node.node"));
const whisperAsync = promisify(whisper);

function convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                "-ac", "1",              // mono
                "-ar", "16000"           // 16kHz sample rate
            ])
            .output(outputPath)
            .on("end", () => resolve(outputPath))
            .on("error", reject)
            .run();
    });
}

// const modelName = "ggml-base.en.bin";
const modelName = "ggml-medium.bin";

async function transcribeAudio(filename) {
    const modelPath = path.join(whisperBaseLocation, "models", modelName);
    
    // Convert to WAV format that whisper expects
    const tempWavPath = path.join(path.dirname(filename), `temp_${Date.now()}.wav`);
    
    try {
        console.log("Converting audio to WAV format...");
        await convertToWav(filename, tempWavPath);
        
        console.log("Starting transcription...");
        const params = {
            language: "auto",
            model: modelPath,
            fname_inp: tempWavPath,
            translate: false,
            print_progress: false,
            print_realtime: false,
            print_timestamps: false,
            progress_callback: (progress) => {
                console.log(`Transcription progress: ${progress}%`);
            }
        };
        
        const result = await whisperAsync(params);
        
        // Clean up temp file
        if (fs.existsSync(tempWavPath)) {
            fs.unlinkSync(tempWavPath);
        }
        
        return result;
        
    } catch (error) {
        // Clean up temp file on error
        if (fs.existsSync(tempWavPath)) {
            fs.unlinkSync(tempWavPath);
        }
        throw error;
    }
}

let handleGenerateTranscript = (filename) => {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await transcribeAudio(filename);
            let message = {};
            message.errMessage = 'Transcript successfully created';
            message.data = result;
            resolve(message);
        } catch (e) {
            console.error(`Error generating transcript from video with filename ${filename}`, e);
            reject(e);
        }
    });
}

module.exports = { handleGenerateTranscript };
