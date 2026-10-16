# Pixel Pipers

Count pipes in a photo automatically. You upload an image of a pipe bundle, a YOLO model finds
every pipe end, and the site shows the total count with a dot or a number drawn on each pipe.

## Project structure

```
Pixel piper complete/
├── Frontend/                 React + TypeScript + Vite + Tailwind website
│   ├── .env                  backend URL + API token
│   └── src/
│       ├── main.tsx          entry point
│       ├── App.tsx           routes (/, /demo, /login, /register, /payment ...)
│       ├── pages/            one file per page (Demo.tsx = pipe counting page)
│       ├── container/        Header + Footer
│       ├── components/       reusable UI (buttons, counter, result card, annotation tool)
│       ├── app/              Redux store, slices (state) and actions (API calls)
│       └── lib/              types, validators, static content (navbar links, form fields)
│
├── Backend/                  Python Flask API + YOLO model
│   ├── Dockerfile            production image (gunicorn, port 5000)
│   └── PIPE_model/
│       ├── app.py            all API routes  ← start here
│       ├── draw_on_image.py  draws dots / numbers on detected pipes
│       ├── best.pt           the trained YOLO model used by the app
│       ├── credentials.json  username, password and API token
│       ├── templates/ static/  the /api-doc page served by Flask
│       ├── collect-retrain/  images + labels collected by /retrain
│       ├── old_models/       earlier model versions (not used, kept for reference)
│       ├── web_cam.py        stand-alone webcam demo
│       ├── video_yolo.py     stand-alone video counting demo
│       └── train_model.py    experimental training script (not used)
│
├── API-Docs/                 stand-alone copy of the API documentation (open index.html)
├── DEPLOYMENT.md             how to put it online (Render + Vercel)  ← step by step
├── hf_upload/                created by Backend/make_hf_upload.ps1 (only for paid Hugging Face hosting)
└── _unused_files/            files removed from the project – check and delete this folder
```

`hf_upload/`, `_unused_files/`, `Frontend/.env` and `credentials.json` are in `.gitignore`, so they never go to GitHub.

## How it works

```
Browser (Frontend, :5174)                     Flask (Backend, :5001)
  Demo page                                     POST /frontend
  pick image → resize to ≤800x600 ─────────►    save image → YOLO best.pt → count pipes
  + threshold, colour, dot/number                draw dot/number on every pipe
  show count + marked image  ◄───────────────   { count, image_url }
```

## Run it (Windows)

**Requirements:** Python 3.9+ and Node.js 18+.

Install once:

```powershell
cd Backend\PIPE_model
pip install ultralytics -r requirements.txt

cd ..\..\Frontend
npm install
```

Start (two terminals, keep both open):

```powershell
# Terminal 1 – backend  → http://localhost:5001
cd Backend\PIPE_model
python app.py

# Terminal 2 – frontend → http://localhost:5174
cd Frontend
npm run dev
```

Then open **http://localhost:5174**.

> If the folder path contains `&`, `npm run dev` fails on Windows (cmd.exe treats `&` as a
> command separator). Rename the folder, or start Vite with `node node_modules/vite/bin/vite.js`.

## Configuration

| Setting | Where |
|---|---|
| Backend port (default 5001) | `PORT` environment variable |
| API token | `Backend/PIPE_model/credentials.json` → must equal `VITE_ML_TOKEN` in `Frontend/.env` |
| Backend URL used by the site | `VITE_SERVER_URL` in `Frontend/.env` |
| Frontend port (default 5174) | `Frontend/vite.config.ts` |
| Cloudinary (optional) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` env vars. Without them the result image is returned inline. |

## Not included

The Login / Register and Payment pages call separate servers that are not in this project
(user server `api/login/`, `api/register/` and the Razorpay payment server). The pipe-counting
feature does not need them.
