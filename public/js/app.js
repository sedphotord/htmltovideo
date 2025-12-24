document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const convertBtn = document.getElementById('convertBtn');
    const statusMessage = document.getElementById('statusMessage');
    const downloadLink = document.getElementById('downloadLink');
    const loader = document.querySelector('.loader');
    const btnText = document.querySelector('.btn-text');

    let selectedFile = null;

    // Tabs Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // File Upload Logic
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
            selectedFile = file;
            if (fileNameDisplay) {
                fileNameDisplay.textContent = `Selected: ${file.name}`;
            }
        } else {
            alert('Please select a valid HTML file.');
        }
    }

    // Convert Logic
    convertBtn.addEventListener('click', async () => {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        const fpsInput = document.getElementById('fps');
        const durationInput = document.getElementById('duration');
        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');
        const codeInput = document.getElementById('htmlCode');
        const selectorInput = document.getElementById('selector');
        const audioInput = document.getElementById('audioInput');
        const formatInput = document.getElementById('format');
        const isTransparent = formatInput.value === 'webm'; // Auto-detect transparency from format

        const formData = new FormData();

        // Validation
        if (activeTab === 'upload') {
            if (!fileInput.files[0]) {
                alert('Please upload a file!');
                statusMessage.textContent = 'Please select a file first.';
                statusMessage.style.color = '#ff4444';
                return;
            }
            formData.append('htmlFile', fileInput.files[0]);
        } else { // activeTab === 'code'
            const code = codeInput.value;
            if (!code.trim()) {
                alert('Please paste some HTML code!');
                statusMessage.textContent = 'Please enter HTML code.';
                statusMessage.style.color = '#ff4444';
                return;
            }
            formData.append('htmlCode', code);
        }

        // Settings
        formData.append('fps', fpsInput.value);
        formData.append('duration', durationInput.value);
        formData.append('width', widthInput.value);
        formData.append('height', heightInput.value);
        formData.append('selector', selectorInput.value);
        formData.append('transparent', isTransparent);
        formData.append('format', formatInput.value);

        // Inject Variables
        if (Object.keys(currentVariables).length > 0) {
            formData.append('variables', JSON.stringify(currentVariables));
        }

        if (audioInput.files[0]) {
            formData.append('audioFile', audioInput.files[0]);
        }

        // UI Updates
        convertBtn.disabled = true;
        loader.hidden = false;
        btnText.textContent = 'Processing Queue...';
        statusMessage.textContent = 'Starting batch conversion...';
        statusMessage.style.color = '#888';
        downloadLink.hidden = true; // Hide main download link in batch mode

        // Batch Queue Logic
        if (activeTab === 'upload') {
            const files = Array.from(fileInput.files);
            let processed = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const queueItem = document.getElementById(`queue-item-${i}`);
                if (queueItem) {
                    queueItem.classList.add('active');
                    queueItem.querySelector('.status').textContent = 'Processing...';
                }

                // Prepare per-file data
                const batchData = new FormData();
                batchData.append('htmlFile', file);
                batchData.append('fps', fpsInput.value);
                batchData.append('duration', durationInput.value);
                batchData.append('width', widthInput.value);
                batchData.append('height', heightInput.value);
                batchData.append('selector', selectorInput.value);
                batchData.append('transparent', formatInput.value === 'webm');
                batchData.append('format', formatInput.value);
                if (Object.keys(currentVariables).length > 0) {
                    batchData.append('variables', JSON.stringify(currentVariables));
                }
                if (audioInput.files[0]) batchData.append('audioFile', audioInput.files[0]);

                try {
                    const response = await fetch('/api/convert', {
                        method: 'POST',
                        body: batchData
                    });

                    const data = await response.json();

                    if (data.success) {
                        if (queueItem) {
                            queueItem.classList.remove('active');
                            queueItem.classList.add('done');
                            queueItem.querySelector('.status').innerHTML = `<a href="${data.downloadUrl}" class="download-mini" download>Download</a>`;
                        }
                    } else {
                        if (queueItem) queueItem.querySelector('.status').textContent = 'Error';
                    }
                } catch (err) {
                    if (queueItem) queueItem.querySelector('.status').textContent = 'Failed';
                }

                processed++;
                statusMessage.textContent = `Processed ${processed} of ${files.length}`;
            }

            btnText.textContent = 'Batch Complete';
            convertBtn.disabled = false;
            loader.hidden = true;

        } else {
            // Single Code Mode (Old Logic)
            setLoading(true);
            showProgress(true);
            simulateProgress(); // Start simulated progress

            try {
                const response = await fetch('/api/convert', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    setProgress(100); // Complete
                    setTimeout(() => {
                        showProgress(false);
                        statusMessage.textContent = 'Conversion Successful!';
                        statusMessage.style.color = '#0f0';

                        // Show Download Button
                        downloadLink.href = data.downloadUrl;
                        downloadLink.hidden = false;
                        downloadLink.textContent = 'Download Video';
                        downloadLink.classList.add('pulse'); // Animation hint
                    }, 500);
                } else {
                    showProgress(false);
                    statusMessage.textContent = 'Error: ' + data.error;
                    statusMessage.style.color = '#ff4444';
                }
            } catch (error) {
                console.error('Error:', error);
                showProgress(false);
                statusMessage.textContent = 'An error occurred during conversion.';
                statusMessage.style.color = '#ff4444';
            } finally {
                setLoading(false);
                if (btnText.textContent !== 'Batch Complete') btnText.textContent = 'Start Rendering';
            }
        }
    });

    // File Input Change - Populate Queue
    fileInput.addEventListener('change', (e) => {
        const queue = document.getElementById('fileQueue');
        queue.innerHTML = '';
        if (e.target.files.length) {
            Array.from(e.target.files).forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'queue-item';
                item.id = `queue-item-${index}`;
                item.innerHTML = `
                    <span class="filename">${file.name}</span>
                    <span class="status">Pending</span>
                `;
                queue.appendChild(item);
            });
            // Update Preview with first file
            const reader = new FileReader();
            reader.onload = (e) => updatePreview(e.target.result);
            reader.readAsText(e.target.files[0]);
        }
    });

    // Variable Scanning
    const scanBtn = document.getElementById('scanBtn');
    const varContainer = document.getElementById('varContainer');
    let currentVariables = {};

    scanBtn.addEventListener('click', () => {
        let content = '';
        if (activeTab === 'upload' && fileInput.files.length) {
            const reader = new FileReader();
            reader.onload = (e) => extractVariables(e.target.result);
            reader.readAsText(fileInput.files[0]);
        } else if (activeTab === 'code' && codeInput.value) {
            extractVariables(codeInput.value);
        } else {
            alert('No content to scan!');
        }
    });

    function extractVariables(html) {
        varContainer.innerHTML = '';
        currentVariables = {};

        // Regex to find --var-name:
        // Looks for --[name]: inside style tags or attributes.
        // Simple heuristic scan.
        const regex = /--([a-zA-Z0-9-]+)\s*:/g;
        let match;
        const found = new Set();

        while ((match = regex.exec(html)) !== null) {
            found.add(match[1]);
        }

        if (found.size === 0) {
            varContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No CSS variables found.</p>';
            return;
        }

        found.forEach(name => {
            const item = document.createElement('div');
            item.className = 'var-item';
            item.innerHTML = `
                <label>--${name}</label>
                <input type="text" data-var="${name}" placeholder="Value">
            `;
            item.querySelector('input').addEventListener('input', (e) => {
                currentVariables[name] = e.target.value;
                // Update Preview in real-time?
                // document.documentElement.style.setProperty... in iframe
                // previewFrame.contentDocument.documentElement.style.setProperty(`--${name}`, e.target.value);
                const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
                if (doc) doc.documentElement.style.setProperty(`--${name}`, e.target.value);
            });
            varContainer.appendChild(item);
        });

        document.getElementById('varEmptyState').style.display = 'none';
    }

    // Update FormData with variables (Inject logic needed to be added to convertBtn click handler)
    // IMPORTANT: We need to modify the convertBtn handler to include this.
    // Since I cannot rewrite the entire function easily in this replace block if it's too big,
    // I will use a separate 'settings' object approach or just assume we modify start.

    // ... wait, I need to inject `currentVariables` into `formData` inside the existing click handler.
    // I should modify the existing click handler. 
    // Since I already edited app.js previously, I will do a targeted replacement on the formData section.


    function setLoading(isLoading) {
        convertBtn.disabled = isLoading;
        loader.hidden = !isLoading;

        if (isLoading) {
            btnText.textContent = 'Generating Video...';
            convertBtn.classList.add('loading-state');
            downloadLink.hidden = true;
            statusMessage.textContent = 'Rendering in progress, please wait...';
            statusMessage.style.color = '#888';
        } else {
            btnText.textContent = 'Start Rendering';
            convertBtn.classList.remove('loading-state');
            // Status message handled by success/error logic
        }
    }

    // Preview Logic
    const previewFrame = document.getElementById('previewFrame');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');

    function updatePreview(content, isUrl = false) {
        if (isUrl) {
            previewFrame.src = URL.createObjectURL(content);
        } else {
            previewFrame.srcdoc = content;
        }
        updateIframeSize();
    }

    function updateIframeSize() {
        const width = widthInput.value || 800;
        const height = heightInput.value || 3000;
        const zoom = zoomSlider.value;

        previewFrame.style.width = `${width}px`;
        previewFrame.style.height = `${height}px`;

        // Apply Scale
        previewFrame.style.transform = `scale(${zoom})`;
        previewFrame.style.transformOrigin = 'top center';

        zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    }

    // Resolution Presets
    const resolutionPreset = document.getElementById('resolutionPreset');

    const presets = {
        'vertical': { w: 800, h: 3000 },
        '4k': { w: 3840, h: 2160 },
        '1080p': { w: 1920, h: 1080 },
        'portrait': { w: 1080, h: 1920 },
        'story': { w: 1080, h: 1920 },
        'square': { w: 1080, h: 1080 }
    };

    resolutionPreset.addEventListener('change', () => {
        const value = resolutionPreset.value;
        if (value === 'auto') {
            detectResolution();
        } else if (value !== 'custom' && presets[value]) {
            widthInput.value = presets[value].w;
            heightInput.value = presets[value].h;
            updateIframeSize();
        }
    });

    function detectResolution() {
        // Try to get dimensions from iframe content
        try {
            const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
            if (doc && doc.body) {
                // Determine best size.
                // Strategy: Use scrollWidth/scrollHeight of body or a known container
                let w = doc.body.scrollWidth;
                let h = doc.body.scrollHeight;

                // If there's a specific container the user might be targeting
                const mainContainer = doc.querySelector('.container') || doc.querySelector('#container') || doc.body.firstElementChild;
                if (mainContainer) {
                    w = Math.max(w, mainContainer.offsetWidth);
                    h = Math.max(h, mainContainer.offsetHeight);
                }

                if (w > 0 && h > 0) {
                    widthInput.value = w;
                    heightInput.value = h;
                    updateIframeSize();
                    autoFitPreview(); // Auto-fit after detection
                    statusMessage.textContent = `Auto-detected: ${w}x${h}`;
                    // Clear status after 3s
                    setTimeout(() => statusMessage.textContent = '', 3000);
                }
            }
        } catch (e) {
            console.log('Auto-detect failed', e);
        }
    }

    function autoFitPreview() {
        const container = document.querySelector('.preview-container');
        // Subtract padding (approx 40px)
        const availW = container.clientWidth - 40;
        const availH = container.clientHeight - 40;

        const w = parseInt(widthInput.value) || 800;
        const h = parseInt(heightInput.value) || 3000;

        // Calculate needed scale to fit
        const scaleX = availW / w;
        const scaleY = availH / h;

        // Use smallest scale, but max at 1.0 (don't zoom in to pixelate)
        // Also ensure a minimum scale so it doesn't disappear (e.g. 0.1)
        let scale = Math.min(scaleX, scaleY, 1.0);
        scale = Math.max(scale, 0.1);

        zoomSlider.value = scale;
        updateIframeSize();
    }

    // Trigger auto-detect when content loads if 'auto' is selected
    previewFrame.addEventListener('load', () => {
        if (resolutionPreset.value === 'auto') {
            detectResolution();
        } else {
            // Even if not auto-res, auto-fit the view on load
            autoFitPreview();
        }
    });

    // Resolution change triggers auto-fit
    resolutionPreset.addEventListener('change', () => {
        const value = resolutionPreset.value;
        if (value === 'auto') {
            detectResolution();
        } else if (value !== 'custom' && presets[value]) {
            widthInput.value = presets[value].w;
            heightInput.value = presets[value].h;
            updateIframeSize();
            autoFitPreview();
        }
    });

    // Event Listeners for Preview Controls
    zoomSlider.addEventListener('input', updateIframeSize);

    // Switch to Custom if user edits manually (don't auto-fit while typing)
    widthInput.addEventListener('input', () => {
        resolutionPreset.value = 'custom';
        updateIframeSize();
    });
    heightInput.addEventListener('input', () => {
        resolutionPreset.value = 'custom';
        updateIframeSize();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            handleFile(file);
            updatePreview(file, true);
        }
    });

    const htmlCodeArea = document.getElementById('htmlCode');
    htmlCodeArea.addEventListener('input', () => {
        updatePreview(htmlCodeArea.value);
    });

    // Initial call
    updateIframeSize();
});
