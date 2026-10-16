---
title: Pixel Pipers API
emoji: 🔩
colorFrom: blue
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---
<!-- The block above is read by Hugging Face Spaces (Docker Space on port 7860). Don't remove it. -->

# Pixel Pipers – Backend

Live: **https://pixel-pipers.onrender.com** (docs: [/api-doc](https://pixel-pipers.onrender.com/api-doc)). It is hosted on Render (free plan) and auto-deploys on every push to `main`.

Flask API that counts pipes in an image with a trained YOLO model (`PIPE_model/best.pt`).
All code is in [`PIPE_model/app.py`](PIPE_model/app.py).

## Setup

1. Install the Python packages:

   ```bash
   cd PIPE_model
   pip install ultralytics -r requirements.txt
   ```

2. Check `PIPE_model/credentials.json`:

   ```json
   {
     "username": "admin",
     "password": "change-me",
     "token": "sk_your_token"
   }
   ```

   `token` must be the same as `VITE_ML_TOKEN` in `Frontend/.env`.

3. (Optional) Cloudinary: set the `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
   `CLOUDINARY_API_SECRET` environment variables to host the result images there.
   Without them, the result image is sent back inline as a `data:image/jpeg;base64,...` URL.

## Run

```bash
cd PIPE_model
python app.py
```

The server starts on **http://localhost:5001**. Set the `PORT` environment variable to use a
different port. The API documentation is at **http://localhost:5001/api-doc**.

## API

All routes except `/login` and `/api-doc` need the header `Authorization: Bearer <token>`.

| Method | Route | Input | Output |
|---|---|---|---|
| POST | `/login` | JSON `username`, `password` | `{ token }` |
| POST | `/frontend` | form `uploadImage`, `confidence_threshold`, `key` (0 dot / 1 number), `color`, `font_scale` | `{ count, image_url }` |
| POST | `/images` | same as `/frontend` | `{ count, image_base64 }` |
| POST | `/coordinates` | form `uploadImage`, `confidence_threshold` | `{ count, coordinates[] }` |
| POST | `/cloudinary` | JSON `image_path` (URL), `confidence_threshold` | `{ count, image_url }` |
| POST | `/retrain` | form `uploadImage`, `uploadTxt` | saved to `collect-retrain/` |
| GET | `/api-doc` | – | HTML documentation |

Example:

```bash
curl -X POST http://localhost:5001/frontend \
  -H "Authorization: Bearer sk_your_token" \
  -F "uploadImage=@pipes.jpg" -F "confidence_threshold=0.6" -F "key=1"
```

## Docker

```bash
docker build -t pixel-pipers-backend .
docker run -p 7860:7860 -e API_TOKEN=sk_your_token -e API_USERNAME=admin -e API_PASSWORD=secret pixel-pipers-backend
```

Inside Docker the app runs with gunicorn (1 worker, fits 512 MB) on `$PORT`, default 7860.
The token comes from environment variables, so `credentials.json` is not copied into the image.
To deploy (Render + Vercel), see `../DEPLOYMENT.md`.
`Caddyfile` / `Dockerfile.caddy` were used to add HTTPS in the old Azure deployment.

## Other files

- `draw_on_image.py`: draws the dots and numbers on the detected pipes.
- `web_cam.py`: live detection from a webcam: `python web_cam.py 0`
- `video_yolo.py`: counts pipes in a video file: `python video_yolo.py video.mp4`
- `train_model.py`: experimental training script. It does not run as-is (see the note inside).
- `old_models/`: earlier versions of the model. They are not used.
- `runs/`: temporary YOLO output. It is created and cleaned up automatically.
