"""
Pixel Pipers – Flask backend.

Loads a trained YOLO model (best.pt) that detects pipe ends in a photo, and exposes a
small REST API used by the React frontend (and documented at /api-doc).

Endpoints (all except /login and /api-doc need the header  Authorization: Bearer <token>):
    POST /login        username + password  -> the API token
    POST /frontend     upload image         -> { count, image_url }      (used by the website)
    POST /images       upload image         -> { count, image_base64 }
    POST /coordinates  upload image         -> { count, coordinates[] }  (YOLO boxes as text)
    POST /cloudinary   image URL (JSON)     -> { count, image_url }
    POST /retrain      image + label .txt   -> saved in collect-retrain/ for future training
    GET  /api-doc      HTML API documentation

How one detection request works:
    1. Save the uploaded image to a temporary file with a random (uuid) name.
    2. model.predict() finds the pipes. With save_txt=True YOLO writes one line per pipe to
       runs/detect/<run>/labels/<image>.txt in the format:  class x_center y_center width height
       (all values 0–1, relative to the image size).
    3. draw_on_image.py reads that .txt and draws a dot or a number on every pipe.
    4. The marked image is returned (Cloudinary URL if configured, otherwise inline base64).
    5. All temporary files and the YOLO run folder are deleted.

Run locally:   python app.py      (http://localhost:5001)
Run in Docker: see ../Dockerfile  (gunicorn on port 5000)
"""

from cloudinary import config
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from functools import wraps
import ultralytics
import base64
import json
import uuid
import requests
import os
import shutil
import time
from werkzeug.utils import secure_filename
import cloudinary.uploader
from draw_on_image import draw_bounding_boxes_number, draw_bounding_boxes


# ---------------------------------------------------------------------------
# Paths & settings
# ---------------------------------------------------------------------------

# Folder that contains this file. Everything (model, temp images, runs/) is relative to it.
# Before, this was hard-coded to "/code" (the Docker WORKDIR), so it only worked in Docker.
CODE_DIR = os.environ.get("CODE_DIR", os.path.dirname(os.path.abspath(__file__))).replace("\\", "/")
os.chdir(CODE_DIR)
os.makedirs(CODE_DIR + "/collect-retrain/images", exist_ok=True)
os.makedirs(CODE_DIR + "/collect-retrain/labels", exist_ok=True)

model_name = "best.pt"           # the trained pipe-detection model
DEFAULT_CONFIDENCE = 0.6         # used when the request does not send confidence_threshold
DEFAULT_COLOR = '#FFFFFF'        # marker colour when the request does not send one
DEFAULT_FONT_SCALE = 0.5         # size of the numbers drawn on the image

# Load the model once at start-up (takes a few seconds) – every request reuses it
model = ultralytics.YOLO(model_name)

app = Flask(__name__)

# Allow the React app (running on another port/domain) to call this API from the browser
CORS(app, origins='*')


# ---------------------------------------------------------------------------
# Cloudinary (optional image hosting)
# Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET as environment
# variables to upload result images to Cloudinary. Without them, images are returned inline.
# ---------------------------------------------------------------------------
CLOUDINARY_CONFIGURED = all(os.environ.get(k) for k in
                            ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))
config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
)


def upload_result_image(path, **kwargs):
    """Upload to Cloudinary if configured, otherwise return an inline data URL.

    A data URL ("data:image/jpeg;base64,...") can be used directly as <img src>, so the
    frontend works the same either way.
    """
    if CLOUDINARY_CONFIGURED:
        return cloudinary.uploader.upload(path, **kwargs)['secure_url']
    return "data:image/jpeg;base64," + image_to_base64(path)


# ---------------------------------------------------------------------------
# Authentication
# Username, password and API token come from (first match wins):
#   1. environment variables API_USERNAME, API_PASSWORD, API_TOKEN
#      → used when deployed (Render "Environment Variables"), so they are never in the public code
#   2. credentials.json → used when running locally, e.g.
#      { "username": "admin", "password": "admin", "token": "sk_..." }
# The same token must be in Frontend/.env (or Vercel settings) as VITE_ML_TOKEN.
# ---------------------------------------------------------------------------
def load_credentials():
    if os.environ.get('API_TOKEN'):
        return {
            'username': os.environ.get('API_USERNAME', ''),
            'password': os.environ.get('API_PASSWORD', ''),
            'token': os.environ['API_TOKEN'],
        }
    if not os.path.exists('credentials.json'):
        raise SystemExit("No credentials found: set the API_TOKEN environment variable "
                         "or create credentials.json (see credentials.example.json)")
    with open('credentials.json') as f:
        return json.load(f)


credentials = load_credentials()


def authenticate(f):
    """Decorator: reject the request with 401 unless it has 'Authorization: Bearer <token>'."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'message': 'Missing Authorization Header'}), 401

        # Expected format: "Bearer <token>"
        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) != 2:
            return jsonify({'message': 'Invalid Authorization Header'}), 401

        token = parts[1]
        if token != credentials['token']:
            return jsonify({'message': 'Invalid or expired token'}), 401

        return f(*args, **kwargs)

    return decorated_function


@app.route('/login', methods=['POST'])
def login():
    """Exchange username + password (JSON body) for the API token."""
    auth_request = request.get_json(silent=True) or {}
    username = auth_request.get('username')
    password = auth_request.get('password')

    # `username and password` stops an empty login from matching unset credentials
    if username and password and username == credentials['username'] \
            and password == credentials['password']:
        return jsonify({'token': credentials['token']})
    return jsonify({'message': 'Invalid username or password'}), 401


# ---------------------------------------------------------------------------
# Detection helpers (shared by all the detection routes)
# ---------------------------------------------------------------------------
def save_uploaded_image():
    """Save request.files['uploadImage'] as <uuid>.jpg.

    Returns (image_name, image_path), or (None, error_response) if no file was sent.
    A random name means two users uploading at the same time never overwrite each other.
    """
    if "uploadImage" not in request.files:
        return None, jsonify({"Error": "Where is Image ?"})
    file = request.files['uploadImage']
    if file.filename == "":
        return None, jsonify({"Error": "No file Selected"})

    image_name = str(uuid.uuid4())
    image_path = os.path.join(CODE_DIR, image_name + ".jpg")
    file.save(image_path)
    return image_name, image_path


def run_model(image_path, confidence, save_image=True):
    """Run YOLO on one image.

    Returns (count, label_txt_path, run_dir):
        count          – number of pipes found
        label_txt_path – YOLO label file with one line per pipe
        run_dir        – the runs/detect/<run> folder YOLO created (delete it when done)

    We take the folder from results[0].save_dir instead of guessing "the newest folder",
    which could pick another user's folder when two requests run at the same time.
    """
    results = model.predict(source=image_path, conf=confidence, save=save_image,
                            show_labels=False, save_txt=True)
    count = len(results[0])
    run_dir = str(results[0].save_dir)
    image_name = os.path.splitext(os.path.basename(image_path))[0]
    label_txt_path = os.path.join(run_dir, "labels", image_name + ".txt")
    return count, label_txt_path, run_dir


def draw_markers(image_path, label_txt_path, output_path, key, color, font_scale):
    """Draw a dot (key == 0) or a number (key == 1) on every detected pipe."""
    if key == 0:
        draw_bounding_boxes(image_path, label_txt_path, output_path, color)
    else:
        draw_bounding_boxes_number(image_path, label_txt_path, output_path, color, font_scale)


def remove_files(*paths):
    """Delete temporary files/folders, ignoring ones that don't exist."""
    for path in paths:
        if os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)
        elif os.path.exists(path):
            os.remove(path)


def image_to_base64(path):
    with open(path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')


def download_image(url, save_path, down_image, max_attempts=10, retry_delay=1):
    """Download an image from a URL, retrying up to `max_attempts` times. Returns True/False."""
    attempts = 0
    while attempts < max_attempts:
        try:
            response = requests.get(url, stream=True, timeout=2)
            if response.status_code == 200:
                # Read everything first so a half-downloaded file is never saved
                content = response.content
                with open(os.path.join(save_path, down_image), 'wb') as file:
                    file.write(content)
                print(f"Image downloaded successfully: {down_image}")
                return True
            print(f"Failed to download image (attempt {attempts+1}/{max_attempts}): {response.status_code}")
        except Exception as e:
            print(f"An error occurred (attempt {attempts+1}/{max_attempts}): {e}")
        attempts += 1
        time.sleep(retry_delay)

    print("Failed to download image after multiple attempts")
    return False


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route('/api-doc', methods=['GET'])
def api_doc():
    """HTML documentation page (templates/index.html + static/)."""
    return render_template('index.html')


@app.route('/cloudinary', methods=['POST'])
@authenticate
def detect_objects():
    """Count pipes in an image given by URL.

    JSON body: { "image_path": "<image url>", "confidence_threshold": 0.6 (optional) }
    """
    body = request.get_json(silent=True) or {}
    image_url_in = body.get('image_path')
    confidence = float(body.get("confidence_threshold", DEFAULT_CONFIDENCE))

    image_name = str(uuid.uuid4())
    image_path = os.path.join(CODE_DIR, image_name + ".jpg")
    if not download_image(image_url_in, CODE_DIR, image_name + ".jpg"):
        return jsonify({"Error": "Error While Downloading Image"})

    count, label_txt_path, run_dir = run_model(image_path, confidence)

    # Draw dots if pipes were found, otherwise return the original image
    edited_path = os.path.join(CODE_DIR, "edit_" + image_name + ".jpg")
    if count > 0:
        draw_bounding_boxes(image_path, label_txt_path, edited_path, DEFAULT_COLOR)
        image_url = upload_result_image(edited_path, public_id="pixelpipers")
    else:
        image_url = upload_result_image(image_path, public_id="pixelpipers")

    remove_files(image_path, edited_path, run_dir)
    return jsonify({
        'count': str(count),
        'image_url': image_url
    })


@app.route('/frontend', methods=['POST'])
@authenticate
def from_frontend():
    """Main endpoint used by the website (Frontend/src/app/actions/fileAction.ts).

    multipart/form-data:
        uploadImage          – image file (required)
        confidence_threshold – 0.1 … 0.9      (default 0.6)
        key                  – 0 = dots, 1 = numbers (default 0)
        color                – hex colour, e.g. "#05eb09"
        font_scale           – size of the numbers (default 0.5)
    Returns: { "count": "53", "image_url": "<url or data:image/jpeg;base64,...>" }
    """
    image_name, result = save_uploaded_image()
    if image_name is None:
        return result
    image_path = result

    confidence = float(request.form.get("confidence_threshold", DEFAULT_CONFIDENCE))
    key = int(request.form.get('key', 0))
    color = str(request.form.get('color', DEFAULT_COLOR))
    font_scale = float(request.form.get('font_scale', DEFAULT_FONT_SCALE))

    count, label_txt_path, run_dir = run_model(image_path, confidence)

    edited_path = os.path.join(CODE_DIR, "edit_" + image_name + ".jpg")
    if count > 0:
        draw_markers(image_path, label_txt_path, edited_path, key, color, font_scale)
        image_url = upload_result_image(edited_path, folder='pixelpipers')
    else:
        # Nothing found – send back the original image
        image_url = upload_result_image(image_path, folder='pixelpipers')

    remove_files(image_path, edited_path, run_dir)
    return jsonify({
        'count': str(count),
        'image_url': image_url
    })


@app.route('/coordinates', methods=['POST'])
@authenticate
def from_coordinate():
    """Return the raw YOLO boxes instead of an image.

    form-data: uploadImage, confidence_threshold (optional)
    Returns: { "count": "51", "coordinates": ["0 0.17 0.68 0.20 0.29", ...] }
             each line = class x_center y_center width height (0–1)
    """
    image_name, result = save_uploaded_image()
    if image_name is None:
        return result
    image_path = result

    confidence = float(request.form.get("confidence_threshold", DEFAULT_CONFIDENCE))

    # save_image=False: we only need the label .txt, not a copy of the image
    count, label_txt_path, run_dir = run_model(image_path, confidence, save_image=False)

    data = read_lines_from_file(label_txt_path) if count > 0 else []

    remove_files(image_path, run_dir)
    return jsonify({
        'count': str(count),
        'coordinates': data
    })


@app.route('/images', methods=['POST'])
@authenticate
def from_frontend_image():
    """Same as /frontend but returns the image as a base64 string.

    form-data: uploadImage, confidence_threshold, key, color, font_scale (all optional except image)
    Returns: { "count": "53", "image_base64": "<base64 jpeg>" }
    """
    image_name, result = save_uploaded_image()
    if image_name is None:
        return result
    image_path = result

    confidence = float(request.form.get("confidence_threshold", DEFAULT_CONFIDENCE))
    key = int(request.form.get('key', 0))
    color = str(request.form.get('color', DEFAULT_COLOR))
    font_scale = float(request.form.get('font_scale', DEFAULT_FONT_SCALE))

    count, label_txt_path, run_dir = run_model(image_path, confidence)

    edited_path = os.path.join(CODE_DIR, "edit_" + image_name + ".jpg")
    if count > 0:
        # Bug fix: the drawing functions were called without colour/font size and crashed
        draw_markers(image_path, label_txt_path, edited_path, key, color, font_scale)
        image_base64 = image_to_base64(edited_path)
    else:
        image_base64 = image_to_base64(image_path)

    remove_files(image_path, edited_path, run_dir)
    return jsonify({'count': str(count), 'image_base64': image_base64})


@app.route('/retrain', methods=['POST'])
@authenticate
def retrain():
    """Collect a corrected example for re-training the model later.

    form-data: uploadImage (image) + uploadTxt (YOLO label file for that image)
    Both are saved as annotation_data_<n>.<ext> in collect-retrain/images and /labels.
    """
    if "uploadImage" not in request.files:
        return jsonify({"Error": "Where is Image File ?"})
    if "uploadTxt" not in request.files:
        return jsonify({"Error": "Where is Text File ?"})

    image_file = request.files['uploadImage']
    text_file = request.files['uploadTxt']

    # Next free number = how many images are already collected
    x_value = count_files_in_folder(CODE_DIR + "/collect-retrain/images/")

    # Keep the original extensions (jpg/png, txt)
    image_ext = image_file.filename.rsplit('.', 1)[-1] if '.' in image_file.filename else 'jpg'
    text_ext = text_file.filename.rsplit('.', 1)[-1] if '.' in text_file.filename else 'txt'
    image_filename = secure_filename(f'annotation_data_{x_value}.{image_ext}')
    text_filename = secure_filename(f'annotation_data_{x_value}.{text_ext}')

    image_path = os.path.join(CODE_DIR + '/collect-retrain/images', image_filename)
    image_file.save(image_path)

    text_path = os.path.join(CODE_DIR + '/collect-retrain/labels', text_filename)
    text_file.save(text_path)

    return jsonify({
        "Success": "Files uploaded and saved successfully.",
        "Image_path": image_path,
        "Text_path": text_path
    })


# ---------------------------------------------------------------------------
# Small file utilities
# ---------------------------------------------------------------------------
def read_lines_from_file(file_path):
    """Return every line of a text file, without the trailing newline."""
    with open(file_path, 'r') as file:
        return [line.strip() for line in file]


def count_files_in_folder(folder_path):
    """Count all files inside a folder (including sub-folders). 0 if it doesn't exist."""
    if not os.path.exists(folder_path):
        return 0
    count = 0
    for _, _, files in os.walk(folder_path):
        count += len(files)
    return count


if __name__ == '__main__':
    # use_reloader=False: Flask's auto-reloader restarted the server in the middle of a
    # request whenever YOLO/torch loaded a module, which killed that request.
    # PORT can be changed with an environment variable, e.g.  set PORT=5002
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), use_reloader=False)
