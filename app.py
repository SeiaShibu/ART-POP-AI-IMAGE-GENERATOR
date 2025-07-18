from flask import Flask, render_template, request, jsonify, session, send_from_directory
import os
from dotenv import load_dotenv
import io
import base64 # Import base64
import requests
import json
import uuid # For unique filenames

# Import your services functions
from services import (
    lifestyle_shot_by_image,
    lifestyle_shot_by_text,
    add_shadow,
    create_packshot,
    enhance_prompt,
    generative_fill, # This will now receive base64 encoded data via its signature
    generate_hd_image,
    erase_foreground # This will now receive base64 encoded data via its signature
)

# You might need to import background_service if it's used directly
# from services.background_service import remove_background 

app = Flask(__name__)
app.secret_key = os.urandom(24) # Replace with a strong, static key in production

# Load environment variables
load_dotenv(verbose=True)

# Debug: Print environment variable status
api_key_env = os.getenv("BRIA_API_KEY")
print(f"API Key present (from env): {bool(api_key_env)}")
print(f"Current working directory: {os.getcwd()}")
print(f".env file exists: {os.path.exists('.env')}")

# Configure upload and generated image folders
UPLOAD_FOLDER = 'static/uploads'
GENERATED_FOLDER = 'static/generated_images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_FOLDER, exist_ok=True)

@app.route('/')
def index():
    # Clear session data to ensure a "new fresh page" experience
    # This will reset all session variables on every visit/refresh
    session.clear() 
    
    # Initialize session state-like variables after clearing
    # The API key should ideally persist or be re-entered, but for a "fresh" page,
    # we'll re-load it from environment variables if available.
    session['api_key'] = os.getenv('BRIA_API_KEY')
    session['generated_images'] = []
    session['current_image_url'] = None
    session['original_prompt'] = ""
    session['enhanced_prompt'] = None
    
    return render_template('index.html', 
                           api_key_set=bool(session['api_key']),
                           current_image_url=session['current_image_url'],
                           generated_images=session['generated_images'],
                           original_prompt=session['original_prompt'],
                           enhanced_prompt=session['enhanced_prompt']
                          )

@app.route('/set_api_key', methods=['POST'])
def set_api_key():
    data = request.get_json()
    api_key = data.get('api_key')
    session['api_key'] = api_key
    return jsonify(success=True)

def save_image_to_static(image_content, folder, filename=None):
    """Saves image content to a static folder and returns its URL."""
    if not filename:
        filename = f"{uuid.uuid4()}.png" # Or jpg based on content type
    filepath = os.path.join(folder, filename)
    with open(filepath, 'wb') as f:
        f.write(image_content)
    return f"/{folder}/{filename}"

@app.route('/generate_image', methods=['POST'])
def handle_generate_image():
    if not session.get('api_key'):
        return jsonify(success=False, error="API key not set. Please set it in the sidebar.")

    prompt = request.form.get('prompt')
    num_images = int(request.form.get('num_images', 1))
    aspect_ratio = request.form.get('aspect_ratio', '1:1')
    enhance_img = request.form.get('enhance_img') == 'true'
    style = request.form.get('style', 'Realistic')
    
    current_prompt = session.get('enhanced_prompt') or prompt

    if not current_prompt:
        return jsonify(success=False, error="Please enter a prompt.")

    try:
        result = generate_hd_image(
            prompt=current_prompt,
            api_key=session['api_key'],
            num_results=num_images,
            aspect_ratio=aspect_ratio,
            sync=True,  # For simplicity, keep sync for initial Flask version
            enhance_image=enhance_img,
            medium="art" if style != "Realistic" else "photography",
            prompt_enhancement=False,
            content_moderation=True
        )

        if result:
            image_urls = []
            if isinstance(result, dict):
                if "result_url" in result:
                    image_urls.append(result["result_url"])
                elif "result_urls" in result:
                    image_urls.extend(result["result_urls"])
                elif "result" in result and isinstance(result["result"], list):
                    for item in result["result"]:
                        if isinstance(item, dict) and "urls" in item:
                            image_urls.extend(item["urls"])
                        elif isinstance(item, list):
                            image_urls.extend(item)
            
            # Download and save images to static folder
            saved_image_urls = []
            for url in image_urls:
                img_data = requests.get(url).content
                local_url = save_image_to_static(img_data, GENERATED_FOLDER)
                saved_image_urls.append(local_url)

            session['current_image_url'] = saved_image_urls[0] if saved_image_urls else None
            session['generated_images'] = saved_image_urls
            return jsonify(success=True, images=saved_image_urls)
        else:
            return jsonify(success=False, error="No valid result format found in the API response.")

    except Exception as e:
        app.logger.error(f"Error generating images: {str(e)}", exc_info=True)
        error_message = str(e)
        if "422" in error_message:
            error_message = "Content moderation failed. Please ensure the image is appropriate."
        return jsonify(success=False, error=error_message)

@app.route('/enhance_prompt', methods=['POST'])
def handle_enhance_prompt():
    if not session.get('api_key'):
        return jsonify(success=False, error="API key not set.")
    
    prompt = request.get_json().get('prompt')
    if not prompt:
        return jsonify(success=False, error="Please enter a prompt to enhance.")
    
    try:
        result = enhance_prompt(session['api_key'], prompt)
        if result:
            session['enhanced_prompt'] = result
            session['original_prompt'] = prompt # Store the original prompt
            return jsonify(success=True, enhanced_prompt=result)
        else:
            return jsonify(success=False, error="Failed to enhance prompt.")
    except Exception as e:
        app.logger.error(f"Error enhancing prompt: {str(e)}", exc_info=True)
        return jsonify(success=False, error=str(e))

@app.route('/create_packshot', methods=['POST'])
def handle_create_packshot():
    if not session.get('api_key'):
        return jsonify(success=False, error="API key not set.")
    
    if 'product_image' not in request.files:
        return jsonify(success=False, error="No product image uploaded.")
    
    uploaded_file = request.files['product_image']
    if uploaded_file.filename == '':
        return jsonify(success=False, error="No selected file.")

    bg_color = request.form.get('bg_color')
    sku = request.form.get('sku')
    force_rmbg = request.form.get('force_rmbg') == 'true'
    content_moderation = request.form.get('content_moderation') == 'true'

    try:
        image_data = uploaded_file.read()

        if force_rmbg:
            # You'll need to implement or import remove_background service here if it's not in your main services
            # For now, let's assume it's available or handled.
            # Example placeholder:
            # from services.background_service import remove_background
            # bg_result = remove_background(session['api_key'], image_data, content_moderation=content_moderation)
            # if bg_result and "result_url" in bg_result:
            #     image_data = requests.get(bg_result["result_url"]).content
            # else:
            #     return jsonify(success=False, error="Background removal failed.")
            pass # Placeholder, implement actual removal if needed

        result = create_packshot(
            session['api_key'],
            image_data,
            background_color=bg_color,
            sku=sku if sku else None,
            force_rmbg=force_rmbg,
            content_moderation=content_moderation
        )

        if result and "result_url" in result:
            local_url = save_image_to_static(requests.get(result["result_url"]).content, GENERATED_FOLDER)
            session['current_image_url'] = local_url
            return jsonify(success=True, image_url=local_url)
        else:
            return jsonify(success=False, error="No result URL in the API response.")
    except Exception as e:
        app.logger.error(f"Error creating packshot: {str(e)}", exc_info=True)
        error_message = str(e)
        if "422" in error_message:
            error_message = "Content moderation failed. Please ensure the image is appropriate."
        return jsonify(success=False, error=error_message)

@app.route('/add_shadow', methods=['POST'])
def add_shadow_route():
    api_key = session.get('api_key')
    if not api_key:
        return jsonify({"success": False, "error": "API key not set."}), 400

    if 'product_image' not in request.files:
        return jsonify({"success": False, "error": "Product image is required."}), 400

    product_image_file = request.files['product_image']
    shadow_type = request.form.get('shadow_type')
    bg_color = request.form.get('bg_color')
    use_transparent_bg = request.form.get('use_transparent_bg') == 'true'
    shadow_color = request.form.get('shadow_color')
    sku = request.form.get('sku')
    offset_x = int(request.form.get('offset_x', 0))
    offset_y = int(request.form.get('offset_y', 15))
    shadow_intensity = int(request.form.get('shadow_intensity', 60))
    shadow_blur = int(request.form.get('shadow_blur', 20))
    force_rmbg = request.form.get('force_rmbg') == 'true' # This line was added/changed
    content_moderation = request.form.get('content_moderation') == 'true'

    # Float shadow specific parameters
    shadow_width = int(request.form.get('shadow_width', 0)) if shadow_type == "Float" else None
    shadow_height = int(request.form.get('shadow_height', 70)) if shadow_type == "Float" else None


    try:
        image_data = product_image_file.read()

        result = add_shadow(
            api_key=api_key,
            image_data=image_data,
            shadow_type=shadow_type.lower(),
            background_color=None if use_transparent_bg else bg_color,
            shadow_color=shadow_color,
            shadow_offset=[offset_x, offset_y],
            shadow_intensity=shadow_intensity,
            shadow_blur=shadow_blur,
            shadow_width=shadow_width,
            shadow_height=shadow_height,
            sku=sku if sku else None,
            content_moderation=content_moderation,
            force_rmbg=force_rmbg # This parameter was added/changed
        )

        image_url = None
        if isinstance(result, dict) and "result_url" in result:
            image_url = result["result_url"]
        elif isinstance(result, dict) and "urls" in result and isinstance(result["urls"], list) and result["urls"]:
            image_url = result["urls"][0]
        elif isinstance(result, dict) and "result" in result and isinstance(result["result"], list) and result["result"] and "urls" in result["result"][0]:
            image_url = result["result"][0]["urls"][0]

        if image_url:
            session['current_image_url'] = image_url
            return jsonify({"success": True, "image_url": image_url})
        else:
            print(f"DEBUG: No image URL found in Bria response for add_shadow: {result}")
            return jsonify({"success": False, "error": "No valid result URL found in the API response or API returned an unexpected format."}), 500

    except Exception as e:
        print(f"Error in add_shadow_route: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/generative_fill', methods=['POST'])
def generative_fill_route():
    api_key = session.get('api_key')
    if not api_key:
        return jsonify({"success": False, "error": "API key not set."}), 400

    if 'original_image' not in request.files or 'mask_image' not in request.files:
        return jsonify({"success": False, "error": "Original image and mask image are required."}), 400

    original_image_file = request.files['original_image']
    mask_image_file = request.files['mask_image']
    
    # Retrieve new parameters
    prompt = request.form.get('prompt')
    negative_prompt = request.form.get('negative_prompt')
    num_results = int(request.form.get('num_results', 1))
    sync_mode = request.form.get('sync_mode') == 'true'
    seed = int(request.form.get('seed', 0)) # Default to 0 if not provided
    content_moderation = request.form.get('content_moderation') == 'true'

    try:
        original_image_data = original_image_file.read()
        mask_image_data = mask_image_file.read()

        # Call the generative_fill service function
        bria_response = generative_fill(
            api_key=api_key,
            image_data=original_image_data,
            mask_data=mask_image_data,
            prompt=prompt,
            negative_prompt=negative_prompt if negative_prompt else None,
            num_results=num_results,
            sync=sync_mode,
            seed=seed if seed != 0 else None,
            content_moderation=content_moderation
        )
        
        # --- IMPORTANT DEBUGGING STEP ---
        # Print the full Bria AI response to the console
        print(f"DEBUG: Full Bria AI response for generative_fill: {bria_response}") # This line was added/changed
        # --- END IMPORTANT DEBUGGING STEP ---

        image_urls = []
        if isinstance(bria_response, dict):
            # Prioritize 'result_url' for single results
            if "result_url" in bria_response and isinstance(bria_response["result_url"], str):
                image_urls.append(bria_response["result_url"])
            # Then 'result_urls' or 'urls' for multiple results
            elif "result_urls" in bria_response and isinstance(bria_response["result_urls"], list):
                image_urls.extend(bria_response["result_urls"])
            elif "urls" in bria_response and isinstance(bria_response["urls"], list):
                image_urls.extend(bria_response["urls"])
            # Fallback for nested 'result' structure
            elif "result" in bria_response and isinstance(bria_response["result"], list):
                for item in bria_response["result"]:
                    if isinstance(item, dict) and "urls" in item and isinstance(item["urls"], list):
                        image_urls.extend(item["urls"])
                    elif isinstance(item, str):
                        image_urls.append(item)
            # Filter out any non-string or empty URLs
            image_urls = [url for url in image_urls if isinstance(url, str) and url.strip()]

        if image_urls:
            session['generated_images'] = image_urls
            session['current_image_url'] = image_urls[0]
            return jsonify({"success": True, "images": image_urls})
        else:
            return jsonify({"success": False, "error": "No valid result URL found in the API response or API returned an unexpected format."}), 500

    except Exception as e:
        print(f"Error in generative_fill_route: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/erase_elements', methods=['POST'])
def erase_elements_route():
    api_key = session.get('api_key')
    if not api_key:
        return jsonify({"success": False, "error": "API key not set."}), 400

    if 'original_image' not in request.files or 'mask_image' not in request.files:
        return jsonify({"success": False, "error": "Original image and mask image are required."}), 400

    original_image_file = request.files['original_image']
    mask_image_file = request.files['mask_image']
    content_moderation = request.form.get('content_moderation') == 'true'

    try:
        original_image_data = original_image_file.read()
        mask_image_data = mask_image_file.read()

        bria_response = erase_foreground(
            api_key=api_key,
            image_data=original_image_data,
            mask_data=mask_image_data,
            content_moderation=content_moderation
        )

        # --- IMPORTANT DEBUGGING STEP ---
        # Print the full Bria AI response to the console
        print(f"DEBUG: Full Bria AI response for erase_elements: {bria_response}") # This line was added/changed
        # --- END IMPORTANT DEBUGGING STEP ---

        image_url = None
        if isinstance(bria_response, dict):
            if "result_url" in bria_response:
                image_url = bria_response["result_url"]
            elif "result_urls" in bria_response and isinstance(bria_response["result_urls"], list) and bria_response["result_urls"]:
                image_url = bria_response["result_urls"][0]
            elif "urls" in bria_response and isinstance(bria_response["urls"], list) and bria_response["urls"]:
                image_url = bria_response["urls"][0]
            elif "result" in bria_response and isinstance(bria_response["result"], list) and bria_response["result"] and "urls" in bria_response["result"][0]:
                 image_url = bria_response["result"][0]["urls"][0]

        if image_url:
            session['current_image_url'] = image_url
            return jsonify({"success": True, "image_url": image_url})
        else:
            return jsonify({"success": False, "error": "No valid result URL found in the API response or API returned an unexpected format."}), 500

    except Exception as e:
        print(f"Error in erase_elements_route: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
