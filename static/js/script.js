let gfCanvas, gfCtx, eeCanvas, eeCtx;
let isDrawing = false;
let lastX = 0, lastY = 0;
let currentImageGF = null; // Stores the loaded image for GF canvas
let currentImageEE = null; // Stores the loaded image for EE canvas

// Global variables for pending URLs and status containers
let pendingUrlsGF = [];
let pendingUrlsEE = [];
let gfStatusContainer, gfRefreshContainer;
let eeStatusContainer, eeRefreshContainer;


document.addEventListener('DOMContentLoaded', function() {
    // Initial setup for range inputs to show current value
    document.querySelectorAll('input[type="range"]').forEach(input => {
        const valueSpan = document.getElementById(input.id + '_value');
        if (valueSpan) {
            valueSpan.textContent = input.value;
            input.addEventListener('input', () => {
                valueSpan.textContent = input.value;
            });
        }
    });

    // Initialize canvases
    gfCanvas = document.getElementById('gf_canvas');
    gfCtx = gfCanvas.getContext('2d');
    eeCanvas = document.getElementById('ee_canvas');
    eeCtx = eeCanvas.getContext('2d');

    // Set initial canvas dimensions (will be adjusted when image loads)
    gfCanvas.width = 600;
    gfCanvas.height = 400;
    eeCanvas.width = 600;
    eeCanvas.height = 400;

    // Get status and refresh containers for Generative Fill
    gfStatusContainer = document.getElementById('gf_status_container');
    gfRefreshContainer = document.getElementById('gf_refresh_container');

    // Get status and refresh containers for Erase Elements
    eeStatusContainer = document.getElementById('ee_status_container');
    eeRefreshContainer = document.getElementById('ee_refresh_container');


    // Add event listeners for drawing on Generative Fill Canvas
    gfCanvas.addEventListener('mousedown', (e) => startDrawing(e, gfCtx, document.getElementById('gf_brush_color').value, document.getElementById('gf_brush_size').value));
    gfCanvas.addEventListener('mousemove', (e) => draw(e, gfCtx, gfCanvas, document.getElementById('gf_brush_color').value, document.getElementById('gf_brush_size').value));
    gfCanvas.addEventListener('mouseup', endDrawing);
    gfCanvas.addEventListener('mouseout', endDrawing);

    // Add event listeners for drawing on Erase Elements Canvas
    eeCanvas.addEventListener('mousedown', (e) => startDrawing(e, eeCtx, document.getElementById('ee_brush_color').value, document.getElementById('ee_brush_size').value));
    eeCanvas.addEventListener('mousemove', (e) => draw(e, eeCtx, eeCanvas, document.getElementById('ee_brush_color').value, document.getElementById('ee_brush_size').value));
    eeCanvas.addEventListener('mouseup', endDrawing);
    eeCanvas.addEventListener('mouseout', endDrawing);

    // Handle product image upload preview (existing functionality)
    document.getElementById('product_upload').addEventListener('change', function(event) {
        const [file] = event.target.files;
        if (file) {
            const img = document.getElementById('original_product_image');
            const imageUrl = URL.createObjectURL(file);
            img.src = imageUrl;
            img.style.display = 'block';
            console.log('Product Image Preview: Set src to', imageUrl);
            console.log('Product Image Preview: Display style set to block');
        } else {
            console.log('Product Image Preview: No file selected or file input cleared.');
        }
    });

    // Initial toggle for product edit options
    toggleProductOptions();
    toggleLifestyleShotType();
    togglePlacementOptions();
    toggleShadowTypeOptions(); // Ensure shadow options are correctly initialized
});

// Drawing functions
function startDrawing(e, ctx, color, size) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
}

function draw(e, ctx, canvasElement, color, size) {
    if (!isDrawing) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';

    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function endDrawing() {
    isDrawing = false;
}

// Function to load image onto a specific canvas
function loadImageToCanvas(event, canvas, ctx, currentImageVar) {
    const [file] = event.target.files;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Adjust canvas size to image aspect ratio, max width 600px
            const maxWidth = 600;
            const scaleFactor = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;

            // Clear canvas and draw the new image
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Store the original image for later use (e.g., to get original image data)
            currentImageVar.image = img;
            currentImageVar.scaleFactor = scaleFactor;
            currentImageVar.originalFile = file; // Store the original file object

            console.log(`Image loaded to canvas. Canvas size: ${canvas.width}x${canvas.height}`);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Specific functions for GF and EE
function loadGFImageToCanvas(event) {
    // Initialize currentImageGF if it's null
    if (!currentImageGF) currentImageGF = {};
    loadImageToCanvas(event, gfCanvas, gfCtx, currentImageGF);
}

function loadEEImageToCanvas(event) {
    // Initialize currentImageEE if it's null
    if (!currentImageEE) currentImageEE = {};
    loadImageToCanvas(event, eeCanvas, eeCtx, currentImageEE);
}

function clearCanvas(canvas, ctx, currentImageVar) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentImageVar && currentImageVar.image) {
        // Redraw the original image if available
        ctx.drawImage(currentImageVar.image, 0, 0, canvas.width, canvas.height);
    }
    console.log('Canvas cleared.');
}

function clearGFCanvas() {
    clearCanvas(gfCanvas, gfCtx, currentImageGF);
}

function clearEECanvas() {
    clearCanvas(eeCanvas, eeCtx, currentImageEE);
}


function getMaskData(canvas, ctx, isGenerativeFill) {
    // Create a new temporary canvas to draw the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');

    // Get the image data from the main canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Iterate over pixels and create a black and white mask
    // For Generative Fill: drawn areas (black) are mask, rest is white
    // For Erase Elements: drawn areas (white) are mask, rest is black
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // A simple way to detect a drawn pixel is if it's not fully transparent
        // AND its color matches the expected drawing color for the tool.
        // This is a basic approach and might need refinement for complex cases.
        let isDrawn = false;
        if (isGenerativeFill) { // GF: drawn in black, mask is black
            // Check for black color (R=0, G=0, B=0) and non-zero alpha
            if (r === 0 && g === 0 && b === 0 && pixels[i+3] > 0) {
                isDrawn = true;
            }
        } else { // EE: drawn in white, mask is white
            // Check for white color (R=255, G=255, B=255) and non-zero alpha
            if (r === 255 && g === 255 && b === 255 && pixels[i+3] > 0) {
                isDrawn = true;
            }
        }

        if (isDrawn) {
            maskCtx.fillStyle = isGenerativeFill ? 'black' : 'white';
        } else {
            maskCtx.fillStyle = isGenerativeFill ? 'white' : 'black';
        }
        maskCtx.fillRect((i / 4) % canvas.width, Math.floor((i / 4) / canvas.width), 1, 1);
    }

    // Return the mask as a Blob (PNG format)
    return new Promise(resolve => {
        maskCanvas.toBlob(blob => {
            resolve(blob);
        }, 'image/png');
    });
}


// Function to check if pending images are ready (for async operations)
async function checkGeneratedImages(pendingUrlsList, statusContainer, refreshContainer) {
    let readyImages = [];
    let stillPending = [];
    
    for (const url of pendingUrlsList) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.status === 200) {
                readyImages.push(url);
            } else {
                stillPending.push(url);
            }
        } catch (e) {
            console.error("Error checking image URL:", url, e);
            stillPending.push(url);
        }
    }

    // Update the correct global pending list
    if (statusContainer === gfStatusContainer) {
        pendingUrlsGF = stillPending;
    } else if (statusContainer === eeStatusContainer) {
        pendingUrlsEE = stillPending;
    }

    if (readyImages.length > 0) {
        statusContainer.innerHTML = ''; // Clear status
        refreshContainer.innerHTML = ''; // Clear refresh button
        displayImages(readyImages);
        return true;
    }
    return false;
}

// Function for automatic checking (for async operations)
function autoCheckImages(pendingUrlsList, statusContainer, refreshContainer) {
    const maxAttempts = 5; // Increased attempts
    let attempt = 0;
    const intervalId = setInterval(async () => {
        if (attempt < maxAttempts && pendingUrlsList.length > 0) {
            if (await checkGeneratedImages(pendingUrlsList, statusContainer, refreshContainer)) {
                clearInterval(intervalId);
                statusContainer.innerHTML = `<p class="success">✨ Image${pendingUrlsList.length > 1 ? 's' : ''} ready!</p>`;
            } else {
                statusContainer.innerHTML = `<p class="info">🎨 Generation started! Waiting for ${pendingUrlsList.length} image${pendingUrlsList.length > 1 ? 's' : ''}... (Attempt ${attempt + 1}/${maxAttempts})</p>`;
            }
            attempt++;
        } else {
            clearInterval(intervalId);
            if (pendingUrlsList.length > 0) {
                statusContainer.innerHTML = `<p class="warning">⏳ Still generating your image${pendingUrlsList.length > 1 ? 's' : ''}. Please check again manually.</p>`;
                // Add a manual refresh button if auto-check failed
                refreshContainer.innerHTML = `<button onclick="manualCheckImages(this.parentNode.id === 'gf_refresh_container')">🔄 Check for Generated Images</button>`;
            }
        }
    }, 3000); // Check every 3 seconds
}

// Manual check function (for async operations)
async function manualCheckImages(isGenerativeFill) {
    const statusContainer = isGenerativeFill ? gfStatusContainer : eeStatusContainer;
    const refreshContainer = isGenerativeFill ? gfRefreshContainer : eeRefreshContainer;
    const pendingUrlsList = isGenerativeFill ? pendingUrlsGF : pendingUrlsEE;

    statusContainer.innerHTML = `<p class="info">Checking for completed images...</p>`;
    if (await checkGeneratedImages(pendingUrlsList, statusContainer, refreshContainer)) {
        statusContainer.innerHTML = `<p class="success">✨ Image${pendingUrlsList.length > 1 ? 's' : ''} ready!</p>`;
        refreshContainer.innerHTML = ''; // Clear refresh button
    } else {
        statusContainer.innerHTML = `<p class="warning">⏳ Still generating your image${pendingUrlsList.length > 1 ? 's' : ''}... Please check again in a moment.</p>`;
    }
}


// Existing functions (from previous versions)
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].setAttribute('data-tab-name', tabcontent[i].id); // Store tab name
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status_message');
    statusDiv.innerHTML = `<p class="${type}">${message}</p>`;
    setTimeout(() => statusDiv.innerHTML = '', 5000);
}

function displayImages(imageUrls) {
    const resultsDiv = document.getElementById('generated_results');
    resultsDiv.innerHTML = '<h3>Generated Images:</h3>'; 

    if (imageUrls && imageUrls.length > 0) {
        const gallery = document.createElement('div');
        gallery.className = 'image-gallery';

        imageUrls.forEach((url, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';

            const img = document.createElement('img');
            img.src = url;
            img.alt = `Generated Image ${index + 1}`;
            imageItem.appendChild(img);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `generated_image_${Date.now()}_${index + 1}.png`; 
            downloadLink.textContent = 'Download';
            downloadLink.className = 'download-button'; 
            imageItem.appendChild(downloadLink);

            gallery.appendChild(imageItem);
        });
        resultsDiv.appendChild(gallery);
    } else {
        resultsDiv.innerHTML += '<p>No images generated.</p>';
    }
}

async function setApiKey() {
    const apiKey = document.getElementById('api_key_input').value;
    try {
        const response = await fetch('/set_api_key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ api_key: apiKey }),
        });
        const data = await response.json();
        if (data.success) {
            showStatus("API Key saved successfully!", 'success');
        } else {
            showStatus(`Error saving API Key: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}

async function enhancePrompt() {
    const prompt = document.getElementById('prompt_input').value;
    if (!prompt) {
        showStatus("Please enter a prompt to enhance.", 'warning');
        return;
    }

    showStatus("Enhancing prompt...", 'info');
    try {
        const response = await fetch('/enhance_prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt }),
        });
        const data = await response.json();
        if (data.success) {
            showStatus("Prompt enhanced successfully!", 'success');
            const enhanceButton = document.querySelector('#generateImage button[onclick="enhancePrompt()"]');
            if (enhanceButton) {
                // Check if the enhanced prompt display already exists
                let enhancedPromptDisplay = enhanceButton.parentNode.querySelector('p.enhanced-prompt-display');
                if (!enhancedPromptDisplay) {
                    // Create it if it doesn't exist
                    enhancedPromptDisplay = document.createElement('p');
                    enhancedPromptDisplay.classList.add('enhanced-prompt-display'); // Add a class for easier selection
                    enhanceButton.parentNode.insertBefore(enhancedPromptDisplay, enhanceButton.nextSibling);
                }
                enhancedPromptDisplay.innerHTML = `<strong>Enhanced Prompt:</strong> <em>${data.enhanced_prompt}</em>`;
            } else {
                console.error("Enhance Prompt button not found. Cannot display enhanced prompt.");
            }
        } else {
            showStatus(`Error enhancing prompt: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}


async function generateImage() {
    const prompt = document.getElementById('prompt_input').value;
    const num_images = document.getElementById('num_images').value;
    const aspect_ratio = document.getElementById('aspect_ratio').value;
    const enhance_img = document.getElementById('enhance_img').checked;
    const style = document.getElementById('image_style').value;

    if (!prompt) {
        showStatus("Please enter a prompt.", 'warning');
        return;
    }

    showStatus("Generating your masterpiece...", 'info');

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('num_images', num_images);
    formData.append('aspect_ratio', aspect_ratio);
    formData.append('enhance_img', enhance_img);
    formData.append('style', style);

    try {
        const response = await fetch('/generate_image', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            showStatus("Image generated successfully!", 'success');
            displayImages(data.images);
        } else {
            showStatus(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}

function toggleProductOptions() {
    const selectedOption = document.getElementById('edit_option').value;
    document.querySelectorAll('.edit-options').forEach(div => {
        div.style.display = 'none';
    });
    if (selectedOption === "Create Packshot") {
        document.getElementById('packshot_options').style.display = 'block';
    } else if (selectedOption === "Add Shadow") {
        document.getElementById('shadow_options').style.display = 'block';
    } else if (selectedOption === "Lifestyle Shot") {
        document.getElementById('lifestyle_options').style.display = 'block';
    }
}

function toggleLifestyleShotType() {
    const shotType = document.querySelector('input[name="shot_type"]:checked').value;
    if (shotType === "Text Prompt") {
        document.getElementById('text_prompt_options').style.display = 'block';
        document.getElementById('reference_image_options').style.display = 'none';
        document.getElementById('exclude_elements_div').style.display = document.getElementById('ls_fast_mode').checked ? 'none' : 'block';
    } else {
        document.getElementById('text_prompt_options').style.display = 'none';
        document.getElementById('reference_image_options').style.display = 'block';
    }
}

function toggleShadowTypeOptions() {
    const shadowType = document.getElementById('shadow_type').value;
    document.getElementById('float_shadow_settings').style.display = (shadowType === "Float") ? 'block' : 'none';
    
    // Update shadow blur default based on type, just like Streamlit
    const shadowBlurInput = document.getElementById('shadow_blur');
    const shadowBlurValueSpan = document.getElementById('shadow_blur_value');
    if (shadowType === "Natural" || shadowType === "Drop") { 
        shadowBlurInput.value = 20; 
    } else if (shadowType === "Float") {
        shadowBlurInput.value = 15; 
    }
    shadowBlurValueSpan.textContent = shadowBlurInput.value;
}

function togglePlacementOptions() {
    const placementType = document.getElementById('placement_type').value;
    document.getElementById('manual_placement_select').style.display = 'none';
    document.getElementById('manual_padding_inputs').style.display = 'none';
    document.getElementById('custom_coordinates_inputs').style.display = 'none';
    document.getElementById('shot_size_inputs').style.display = 'block'; // Default to visible

    if (placementType === "Manual Placement") {
        document.getElementById('manual_placement_select').style.display = 'block';
    } else if (placementType === "Manual Padding") {
        document.getElementById('manual_padding_inputs').style.display = 'block';
        document.getElementById('shot_size_inputs').style.display = 'none'; 
    } else if (placementType === "Custom Coordinates") {
        document.getElementById('custom_coordinates_inputs').style.display = 'block';
    }
}


async function createPackshot() {
    const uploadedFile = document.getElementById('product_upload').files[0];
    if (!uploadedFile) {
        showStatus("Please upload a product image first.", 'warning');
        return;
    }

    showStatus("Creating professional packshot...", 'info');

    const formData = new FormData();
    formData.append('product_image', uploadedFile);
    formData.append('bg_color', document.getElementById('packshot_bg_color').value);
    formData.append('sku', document.getElementById('packshot_sku').value);
    formData.append('force_rmbg', document.getElementById('packshot_force_rmbg').checked);
    formData.append('content_moderation', document.getElementById('packshot_content_moderation').checked);

    try {
        const response = await fetch('/create_packshot', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            showStatus("Packshot created successfully!", 'success');
            displayImages([data.image_url]);
        } else {
            showStatus(`Error creating packshot: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}

async function addShadow() {
    const uploadedFile = document.getElementById('product_upload').files[0];
    if (!uploadedFile) {
        showStatus("Please upload a product image first.", 'warning');
        return;
    }

    showStatus("Adding shadow effect...", 'info');

    const formData = new FormData();
    formData.append('product_image', uploadedFile);
    formData.append('shadow_type', document.getElementById('shadow_type').value);
    formData.append('bg_color', document.getElementById('shadow_bg_color').value);
    formData.append('use_transparent_bg', document.getElementById('use_transparent_bg').checked);
    formData.append('shadow_color', document.getElementById('shadow_color').value);
    formData.append('sku', document.getElementById('shadow_sku').value);
    formData.append('offset_x', document.getElementById('offset_x').value);
    formData.append('offset_y', document.getElementById('offset_y').value);
    formData.append('shadow_intensity', document.getElementById('shadow_intensity').value);
    formData.append('shadow_blur', document.getElementById('shadow_blur').value);
    formData.append('force_rmbg', document.getElementById('shadow_force_rmbg').checked);
    formData.append('content_moderation', document.getElementById('shadow_content_moderation').checked);

    if (document.getElementById('shadow_type').value === "Float") {
        formData.append('shadow_width', document.getElementById('shadow_width').value);
        formData.append('shadow_height', document.getElementById('shadow_height').value);
    }

    try {
        const response = await fetch('/add_shadow', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            showStatus("Shadow added successfully!", 'success');
            displayImages([data.image_url]);
        } else {
            showStatus(`Error adding shadow: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}

async function generateLifestyleShot() {
    const uploadedFile = document.getElementById('product_upload').files[0];
    if (!uploadedFile) {
        showStatus("Please upload a product image first.", 'warning');
        return;
    }

    showStatus("Generating lifestyle shot...", 'info');

    const formData = new FormData();
    formData.append('product_image', uploadedFile);
    formData.append('shot_type', document.querySelector('input[name="shot_type"]:checked').value);
    formData.append('placement_type', document.getElementById('placement_type').value);
    formData.append('num_results', document.getElementById('ls_num_results').value);
    formData.append('sync_mode', document.getElementById('ls_sync_mode').checked);
    formData.append('original_quality', document.getElementById('ls_original_quality').checked);
    formData.append('sku', document.getElementById('ls_sku').value);
    formData.append('force_rmbg', document.getElementById('ls_force_rmbg').checked);
    formData.append('content_moderation', document.getElementById('ls_content_moderation').checked);

    const placementType = document.getElementById('placement_type').value;
    if (placementType === "Manual Placement") {
        const selectedPositions = Array.from(document.getElementById('manual_placements').options)
                                    .filter(option => option.selected)
                                    .map(option => option.value);
        selectedPositions.forEach(pos => formData.append('manual_placements[]', pos));
    } else if (placementType === "Manual Padding") {
        formData.append('pad_left', document.getElementById('pad_left').value);
        formData.append('pad_right', document.getElementById('pad_right').value);
        formData.append('pad_top', document.getElementById('pad_top').value);
        formData.append('pad_bottom', document.getElementById('pad_bottom').value);
    } else if (placementType === "Custom Coordinates") {
        formData.append('fg_width', document.getElementById('fg_width').value);
        formData.append('fg_height', document.getElementById('fg_height').value);
        formData.append('fg_x', document.getElementById('fg_x').value);
        formData.append('fg_y', document.getElementById('fg_y').value);
    }
    formData.append('shot_width', document.getElementById('shot_width').value);
    formData.append('shot_height', document.getElementById('shot_height').value);


    const shotType = document.querySelector('input[name="shot_type"]:checked').value;
    if (shotType === "Text Prompt") {
        const sceneDescription = document.getElementById('scene_description').value;
        if (!sceneDescription) {
            showStatus("Please describe the environment for the lifestyle shot.", 'warning');
            return;
        }
        formData.append('scene_description', sceneDescription);
        formData.append('fast_mode', document.getElementById('ls_fast_mode').checked);
        formData.append('optimize_desc', document.getElementById('ls_optimize_desc').checked);
        if (!document.getElementById('ls_fast_mode').checked) {
            formData.append('exclude_elements', document.getElementById('exclude_elements').value);
        }
    } else { 
        const referenceImage = document.getElementById('reference_image_upload').files[0];
        if (!referenceImage) {
            showStatus("Please upload a reference image for the lifestyle shot.", 'warning');
            return;
        }
        formData.append('reference_image', referenceImage);
        formData.append('enhance_ref', document.getElementById('enhance_ref').checked);
        formData.append('ref_influence', document.getElementById('ref_influence').value);
    }

    try {
        const response = await fetch('/lifestyle_shot', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            showStatus("Lifestyle shot generated successfully!", 'success');
            displayImages(data.images);
        } else {
            showStatus(`Error generating lifestyle shot: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}

async function handleGenerativeFill() {
    if (!currentImageGF || !currentImageGF.originalFile) {
        showStatus("Please upload an original image to the canvas first.", 'warning');
        return;
    }

    const prompt = document.getElementById('gf_prompt').value;
    const negativePrompt = document.getElementById('gf_negative_prompt').value; // Get negative prompt
    const numResults = document.getElementById('gf_num_results').value; // Get num results
    const syncMode = document.getElementById('gf_sync_mode').checked; // Get sync mode
    const seed = document.getElementById('gf_seed').value; // Get seed
    const contentModeration = document.getElementById('gf_content_moderation').checked;

    if (!prompt) {
        showStatus("Please enter a prompt for Generative Fill.", 'warning');
        return;
    }

    // Clear previous status messages in GF section
    gfStatusContainer.innerHTML = '';
    gfRefreshContainer.innerHTML = '';
    showStatus("Applying Generative Fill...", 'info');

    const formData = new FormData();
    formData.append('original_image', currentImageGF.originalFile);
    
    const maskBlob = await getMaskData(gfCanvas, gfCtx, true);
    const maskFilenameGF = 'mask.png';
    formData.append('mask_image', maskBlob, maskFilenameGF);

    formData.append('prompt', prompt);
    formData.append('negative_prompt', negativePrompt);
    formData.append('num_results', numResults);
    formData.append('sync_mode', syncMode);
    formData.append('seed', seed);
    formData.append('content_moderation', contentModeration);

    try {
        const response = await fetch('/generative_fill', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            if (syncMode) {
                showStatus("Generative Fill applied successfully!", 'success');
                displayImages(data.images);
            } else {
                pendingUrlsGF = data.images; // Store pending URLs
                autoCheckImages(pendingUrlsGF, gfStatusContainer, gfRefreshContainer);
            }
        } else {
            showStatus(`Error applying Generative Fill: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}

async function handleEraseElements() {
    if (!currentImageEE || !currentImageEE.originalFile) {
        showStatus("Please upload an original image to the canvas first.", 'warning');
        return;
    }
    
    const contentModeration = document.getElementById('ee_content_moderation').checked;

    // Clear previous status messages in EE section
    eeStatusContainer.innerHTML = '';
    eeRefreshContainer.innerHTML = '';
    showStatus("Erasing elements...", 'info');

    const formData = new FormData();
    formData.append('original_image', currentImageEE.originalFile);
    
    const maskBlob = await getMaskData(eeCanvas, eeCtx, false);
    const maskFilenameEE = 'mask.png';
    formData.append('mask_image', maskBlob, maskFilenameEE);

    formData.append('content_moderation', contentModeration);

    try {
        const response = await fetch('/erase_elements', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            // Erase Elements is typically synchronous and returns one image
            showStatus("Elements erased successfully!", 'success');
            displayImages([data.image_url]);
        } else {
            showStatus(`Error erasing elements: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Network error: ${error.message}`, 'error');
    }
}
