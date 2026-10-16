# Entry point for gunicorn in Docker:  gunicorn -b 0.0.0.0:$PORT wsgi:app  (see ../Dockerfile)
from app import app

if __name__ == "__main__":
    app.run()
