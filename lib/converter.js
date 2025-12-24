const timesnap = require('timesnap');
const ffmpegPath = require('ffmpeg-static');

async function convertHtmlToVideo(config) {
    // Determine Format
    const format = config.format || 'mp4';
    const isTransparent = format === 'webm'; // Only WebM supports transparency in this logic for now

    // Clean output filename
    let outputConfigName = config.output || `output.${format}`;
    if (!outputConfigName.endsWith(`.${format}`)) {
        outputConfigName = outputConfigName.replace(/\.[^/.]+$/, "") + `.${format}`;
    }

    // Define FFmpeg args based on format
    let outputArgs = [];

    if (format === 'webm') {
        outputArgs = [
            '-c:v', 'libvpx-vp9',
            '-pix_fmt', 'yuva420p',
            '-b:v', '2M',
            '-auto-alt-ref', '0'
        ];
    } else if (format === 'gif') {
        outputArgs = [
            '-vf', 'fps=15,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
            '-loop', '0'
        ];
    } else {
        // MP4 Default
        outputArgs = [
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-preset', 'fast',
            '-crf', '18'
        ];
    }

    const defaults = {
        // Default Fallbacks
        fps: 60,
        duration: 15,
        output: outputConfigName,
        viewport: { width: 800, height: 3000 },
        // Essential settings
        ffmpegPath: ffmpegPath,
        // Transparency Settings (WebM Only)
        transparent: isTransparent,
        outputArgs: outputArgs,
        preparePage: async (page) => {
            // Variable Injection
            if (config.variables) {
                await page.evaluate((vars) => {
                    Object.keys(vars).forEach(key => {
                        document.documentElement.style.setProperty(`--${key}`, vars[key]);
                    });
                }, config.variables);
            }
            await page.evaluate(() => {
                document.body.style.zoom = '1';
            });
        },
        selector: config.selector || null
    };

    const finalConfig = { ...defaults, ...config };
    // Override output with calculated name
    finalConfig.output = outputConfigName;

    console.log('--- Starting Conversion ---');
    console.log(`Format: ${format}`);
    console.log(`URL: ${finalConfig.url}`);
    console.log(`Output: ${finalConfig.output}`);
    console.log(`FPS: ${finalConfig.fps}, Duration: ${finalConfig.duration}s`);
    if (config.audioPath && format !== 'gif') console.log(`Audio: ${config.audioPath}`);

    try {
        // 1. Capture & Convert
        await timesnap(finalConfig);

        // 2. Audio Merge (Video only, GIFs shouldn't have audio)
        if (format !== 'gif' && config.audioPath && require('fs').existsSync(config.audioPath)) {
            console.log('--- Merging Audio ---');
            const ffmpeg = require('fluent-ffmpeg');
            ffmpeg.setFfmpegPath(ffmpegPath);

            const fileWithAudio = finalConfig.output.replace(`.${format}`, `_audio.${format}`);

            await new Promise((resolve, reject) => {
                ffmpeg(finalConfig.output)
                    .input(config.audioPath)
                    .outputOptions([
                        '-c:v copy', // Copy video stream without re-encoding
                        '-c:a aac',  // Encode audio
                        '-map 0:v:0',
                        '-map 1:a:0',
                        '-shortest'  // Cut to shortest stream (video length)
                    ])
                    .save(fileWithAudio)
                    .on('end', () => {
                        // Rename back to original output or return new name
                        // Here we return the new name
                        finalConfig.output = fileWithAudio;
                        resolve();
                    })
                    .on('error', reject);
            });
        }

        console.log('--- Conversion Complete ---');
        return finalConfig.output;
    } catch (err) {
        console.error('--- Conversion Failed ---', err);
        throw err;
    }
}

module.exports = { convertHtmlToVideo };
