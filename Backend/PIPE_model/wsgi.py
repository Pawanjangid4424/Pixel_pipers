# Entry point for gunicorn in Docker:  gunicorn -b :5000 wsgi:app
from app import app

if __name__ == "__main__":
    app.run()
