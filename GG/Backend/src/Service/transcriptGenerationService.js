const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");

const whisperBaseLocation = path.resolve("whisper.cpp");
const factory = require(`${whisperBaseLocation}/bindings/javascript/whisper.js`);

function convertToPCM32Buffer(inputPath) {
    return new Promise((resolve, reject) => {
        const buffers = [];
        const stream = new PassThrough();

        ffmpeg(inputPath)
            .outputOptions([
                "-map", "0:a:0",
                "-f", "f32le",           // raw float32
                "-acodec", "pcm_f32le",  // 32-bit float codec
                "-ac", "1",              // mono
                "-ar", "16000"           // 16kHz sample rate (required by Whisper)
            ])
            .on("error", reject)
            .pipe(stream, { end: true });

        stream.on("data", chunk => buffers.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(buffers)));
    });
}

async function whisper(filename) {
    const whisper = await factory();

    const fnameModel = `${whisperBaseLocation}/models/ggml-base.en.bin`;
    const modelData = fs.readFileSync(fnameModel);

    if (!modelData) throw new Error("Failed to read model file");
    whisper.FS_createDataFile("/", "whisper.bin", modelData, true, true);

    const ok = whisper.init("whisper.bin");
    if (!ok) throw new Error("Failed to initialize Whisper model");

    // --- Convert audio ---
    console.log("Converting audio to PCM float32 in memory...");
    const pcmBuffer = await convertToPCM32Buffer(filename);
    if (!pcmBuffer || pcmBuffer.length === 0) {
        throw new Error("ffmpeg returned empty PCM buffer");
    }

    if (pcmBuffer.length % 4 !== 0) {
        console.warn("Warning: PCM buffer length not divisible by 4 — trimming to align");
    }

    const alignedLength = Math.floor(pcmBuffer.length / 4);
    const pcm = new Float32Array(
        pcmBuffer.buffer,
        pcmBuffer.byteOffset,
        alignedLength
    );

    console.log(`Loaded PCM length: ${pcm.length} samples`);

    // --- Run transcription ---
    const ret = whisper.full_default(pcm, "en", false);
    if (ret !== 0) throw new Error("Whisper failed to transcribe");

    const transcript = whisper.get_transcription_text
        ? whisper.get_transcription_text()
        : "(Binding does not expose get_transcription_text — output printed to stdout)";

    whisper.free();

    return transcript;
}

let handleGenerateTranscript = (filename) => {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await whisper(filename);
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

module.exports = {handleGenerateTranscript}
