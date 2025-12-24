const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { convertHtmlToVideo } = require('./lib/converter');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static('public')); // Serve frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, 'input-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// API: Convert
const cpUpload = upload.fields([{ name: 'htmlFile', maxCount: 1 }, { name: 'audioFile', maxCount: 1 }]);

app.post('/api/convert', cpUpload, async (req, res) => {
    try {
        const { htmlCode, fps, duration, width, height, selector, format } = req.body;
        let inputFile;

        if (req.files['htmlFile']) {
            inputFile = path.resolve(req.files['htmlFile'][0].path);
        } else if (htmlCode) {
            const tempPath = path.join(__dirname, 'uploads', `temp-${Date.now()}.html`);
            fs.writeFileSync(tempPath, htmlCode);
            inputFile = tempPath;
        } else {
            return res.status(400).json({ error: 'No HTML file or code provided' });
        }

        // Handle Audio
        let audioPath = null;
        if (req.files['audioFile']) {
            audioPath = path.resolve(req.files['audioFile'][0].path);
        }

        // Determine format
        const outputFormat = format || 'mp4'; // default mp4
        const outputFile = `output-${Date.now()}.${outputFormat}`;

        const config = {
            url: `file://${inputFile}`,
            output: outputFile,
            fps: parseInt(fps) || 60,
            duration: parseInt(duration) || 15,
            viewport: {
                width: parseInt(width) || 800,
                height: parseInt(height) || 3000
            },
            selector: selector || null,
            format: outputFormat,
            audioPath: audioPath,
            variables: req.body.variables ? JSON.parse(req.body.variables) : null
        };

        // Start Conversion
        const finalOutput = await convertHtmlToVideo(config); // returns actual filename used (e.g. _audio.mp4)

        // Return download link
        res.json({
            success: true,
            downloadUrl: `/api/download/${path.basename(finalOutput)}`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
});

// API: Download
app.get('/api/download/:filename', (req, res) => {
    const file = path.resolve(req.params.filename);
    if (fs.existsSync(file)) {
        res.download(file);
    } else {
        res.status(404).send('File not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
