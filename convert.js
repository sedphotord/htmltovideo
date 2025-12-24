const timesnap = require('timesnap');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

// Configuration
const config = {
  url: 'Video_fechas.html', // Local file
  viewport: {
    width: 800,
    height: 3000
  },
  fps: 60,
  duration: 15, // Updated to 15s as requested
  output: 'vertical_video.mp4',
  ffmpegPath: ffmpegPath,
  // High quality options
  pixFmt: 'yuv420p',
  screenshotType: 'png', // Optimization: PNG for lossless frames before encoding
  // Puppeteer settings
  launchArguments: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Recommended for high-res rendering
    '--disable-accelerated-2d-canvas',
    '--disable-gpu'
  ],
  // Wait for animation to start
  preparePage: async (page) => {
    // Optional: wait a bit or inject styles if needed
    await page.evaluate(() => {
      // Force high quality rendering if possible
      document.body.style.zoom = '1';
    });
  }
};

console.log('------------------------------------------------');
console.log('Starting HTML to 4K Video Conversion');
console.log('------------------------------------------------');
console.log(`Input:      ${config.url}`);
console.log(`Output:     ${config.output}`);
console.log(`Resolution: ${config.viewport.width}x${config.viewport.height}`);
console.log(`FPS:        ${config.fps}`);
console.log(`Duration:   ${config.duration}s`);
console.log('------------------------------------------------');
console.log('Rendering frames... This may take a while.');

timesnap(config)
  .then(() => {
    console.log('------------------------------------------------');
    console.log('Conversion Completed Successfully!');
    console.log('Video saved as: ' + config.output);
    console.log('------------------------------------------------');
  })
  .catch((err) => {
    console.error('------------------------------------------------');
    console.error('Conversion Failed:', err);
    console.error('------------------------------------------------');
    process.exit(1);
  });
