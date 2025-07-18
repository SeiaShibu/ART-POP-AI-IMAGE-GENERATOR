🎨 ARTPop
ARTPop is a powerful web application built with Flask that leverages the Bria AI API to offer a suite of advanced image generation and manipulation tools. From creating stunning lifestyle shots for products to generating high-definition images from text prompts and performing advanced generative fill and erase operations, ARTPop empowers users to create compelling visual content with ease.

✨ Features
🖼️ Generate Image: Create high-definition images from text prompts with various styles (Realistic, Artistic, Cartoon, etc.) and aspect ratios. Includes an AI-powered prompt enhancement feature to refine your descriptions.

🎯 Product Photography:

Create Packshot: Generate clean product packshots with custom background colors, with an option to force original background removal.

Add Shadow: Apply realistic or artistic shadows to your product images with customizable parameters like type, color, intensity, blur, and offset.

Create Lifestyle Shot: Integrate your product into diverse scenes using either a detailed text description of the environment or a reference image. Offers flexible product placement options (Automatic, Manual, Custom Coordinates).

🎨 Generative Fill: Draw a mask on an image and describe what you want to generate in that specific area, seamlessly blending new AI-generated content into existing images.

✂️ Erase Elements: Effortlessly remove unwanted objects or elements from your images by drawing a mask over them, allowing the AI to intelligently fill the void.

💡 Intuitive UI Controls: A tab-based interface makes navigating between different tools straightforward and user-friendly.

💾 Easy Image Download: Download your generated and edited images with a single click.

🚀 Quick Start
Follow these steps to get ARTPop up and running on your local machine.

Prerequisites
Python 3.8+

pip (Python package installer)

A Bria AI API Key (You can obtain one from Bria AI)

1. Clone the Repository
git clone" https://github.com/your-username/artpop.git](https://github.com/SeiaShibu/ART-POP-AI-IMAGE-GENERATOR.git"
cd artpop

2. Install Dependencies
Install the required Python packages:

pip install -r requirements.txt

requirements.txt content (ensure this file exists in your root directory):

Flask
python-dotenv
requests
Pillow

3. Environment Variables
Create a .env file in the root directory of your project (the same directory as app.py). This file will store your Bria AI API key securely.

BRIA_API_KEY="YOUR_BRIA_AI_API_KEY_HERE"

Replace "YOUR_BRIA_AI_API_KEY_HERE" with your actual Bria AI API key.

4. Run the Application
Start the Flask development server:

python app.py

You should see output similar to this:

 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit

Open your web browser and navigate to http://127.0.0.1:5000 to access ARTPop.

💡 Usage
ARTPop features a tab-based interface for easy navigation between its powerful tools.

Setting Your API Key
Upon first launching the application, or if your API key is not set, you can enter it in the Settings section in the left sidebar. This key will be stored in your session for the duration of your visit.

Using the Tabs:
🎨 Generate Image:

Enter a detailed text prompt describing the image you want.

Optionally, click "✨ Enhance Prompt" to get an AI-suggested improved description.

Adjust parameters like "Number of images," "Aspect ratio," and "Image Style."

Click "🎨 Generate Images" to create new visuals.

🖼️ Product Photography:

Upload your product image.

Select an "Edit Option" from the dropdown:

Create Packshot: Choose a background color and decide if you want to force background removal.

Add Shadow: Select the shadow type (Natural, Drop, Float), color, intensity, blur, and adjust X/Y offsets.

Lifestyle Shot: Choose between "Text Prompt" (describe the scene) or "Reference Image" (upload an image for the scene's style). Configure product placement (e.g., "Automatic," "Manual Placement," "Custom Coordinates") and other generation settings.

Click the corresponding action button (e.g., "Create Packshot," "Add Shadow," "Generate Lifestyle Shot").

🎨 Generative Fill:

Upload your original image to the canvas.

Use the brush tool to draw a black mask over the area you want to fill.

Enter a prompt describing what new content should appear in the masked area.

Optionally, provide a negative prompt, set the number of variations, enable synchronous mode, or specify a seed for reproducibility.

Click "🎨 Apply Generative Fill".

✂️ Erase Elements:

Upload your original image to the canvas.

Use the brush tool to draw a white mask over the objects you wish to remove.

Click "🗑️ Erase Elements".

🌐 Live Demo
Experience ARTPop live here:


"https://art-pop-ai-image-generator.onrender.com"
