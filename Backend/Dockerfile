# ---------------------------------------------------------------------------
# Backend Docker image: Python + YOLO + Flask, served with gunicorn.
#
# Deployed on Render (free plan). Also works on Azure, Hugging Face Spaces or any Docker host.
#
#   Build:  docker build -t pixel-pipers-backend .
#   Run:    docker run -p 7860:7860 -e API_TOKEN=sk_... pixel-pipers-backend
#   Open:   http://localhost:7860/api-doc
#
# Settings (environment variables):
#   API_TOKEN, API_USERNAME, API_PASSWORD  – login + token (see app.py)
#   PORT                                   – port to listen on (Render sets it; default 7860)
#   CLOUDINARY_*                           – optional image hosting (see app.py)
# ---------------------------------------------------------------------------

# Same Python version the app was tested with locally
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Ultralytics/matplotlib want a writable settings folder
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    MPLCONFIGDIR=/tmp/matplotlib

# System libraries OpenCV needs.
# (The old "libgl1-mesa-glx" package no longer exists in current Debian images,
#  which made the old Dockerfile fail to build.)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch: ~4x smaller than the default CUDA build, and free servers have no GPU anyway
RUN pip install --no-cache-dir torch==2.5.1 torchvision==0.20.1 \
    --index-url https://download.pytorch.org/whl/cpu

# YOLO + Flask packages (pinned versions, see requirements.txt)
COPY ./PIPE_model/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Run as a normal user (uid 1000) instead of root – safer, and required by Hugging Face.
# The app writes temp images and YOLO output inside /code, so the user owns it.
RUN useradd -m -u 1000 user
USER user
WORKDIR /code

# App code + model (old_models, runs, credentials.json are excluded by .dockerignore)
COPY --chown=user ./PIPE_model /code/

EXPOSE 7860

# WORKERS (default 1): each worker loads its own copy of the model (~440 MB in use),
#   so 1 worker fits free 512 MB hosts like Render. Use 2+ on bigger servers.
# GUNICORN_TIMEOUT (default 300 s): free hosts have very slow CPUs, so loading the model
#   and the first prediction can take much longer than gunicorn's default 30 s.
# PORT: Render/Hugging Face/Azure set this automatically.
CMD ["sh", "-c", "gunicorn -w ${WORKERS:-1} --timeout ${GUNICORN_TIMEOUT:-300} -b 0.0.0.0:${PORT:-7860} wsgi:app"]
