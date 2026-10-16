# Deploying Pixel Pipers

The backend goes on **Render** and the frontend on **Vercel**. Both are free and deploy straight from GitHub.

```
Anyone's phone / laptop
        │
        ▼
https://pixel-pipers.vercel.app             ← Frontend (Vercel, builds Frontend/ from GitHub)
        │  POST /frontend  (image + token)
        ▼
https://pixel-pipers-api.onrender.com       ← Backend (Render, builds Backend/Dockerfile from GitHub)
```

Code: https://github.com/Pawanjangid4424/Pixel_pipers. Every `git push` redeploys both automatically.

Do the steps **in this order**. The frontend needs the backend's URL.

> **About speed (free plan):** Render's free server has a very small CPU (0.1) and 512 MB RAM.
> Tested with the same limits: the first image after the server wakes up takes about 2–3 min,
> and later images about 1–1.5 min. The server sleeps after 15 min without visitors and takes
> 2–4 min to wake up. Fine for a demo; open the site a few minutes before showing it.
> For fast results, use **Azure for Students** (see the end of this file).

---

## Step 0 – Secrets (already done)

The live-site secrets were generated and saved in **`DEPLOY_SECRETS.txt`** in the project folder.
That file is in `.gitignore`, so it is never uploaded. Open it; you need its values in Steps 1 and 2.

---

## Step 1 – Backend on Render (15 min + build time)

1. Go to **https://render.com**, click **Get Started**, then **GitHub**, and log in with your GitHub account.
2. Click **+ New**, then **Web Service**.
3. Under **Git Provider**, choose **GitHub**. Allow Render to access your repositories,
   or only `Pixel_pipers`, then select **`Pawanjangid4424/Pixel_pipers`** and click **Connect**.
4. Fill in the form:

   | Field | Value |
   |---|---|
   | Name | `pixel-pipers-api` (this becomes the URL) |
   | Language | **Docker** |
   | Branch | `main` |
   | Region | **Singapore** (closest to India) |
   | **Root Directory** | **`Backend`** ← important |
   | Dockerfile Path | `./Dockerfile` (default) |
   | Instance Type | **Free** |

5. Under **Environment Variables**, click **Add Environment Variable** three times and copy the values
   from `DEPLOY_SECRETS.txt`:

   | Key | Value |
   |---|---|
   | `API_TOKEN` | value of API_TOKEN |
   | `API_USERNAME` | `admin` |
   | `API_PASSWORD` | value of API_PASSWORD |

6. Click **Deploy Web Service**.
7. Watch the **Logs**. The first build takes about **10–15 minutes** (it installs PyTorch). When you see
   `Listening at: http://0.0.0.0:10000` and the status turns **Live**, the backend is running.
8. Copy your URL from the top of the page, e.g. `https://pixel-pipers-api.onrender.com`.
   Test it by opening **`<your URL>/api-doc`**. You should see the API documentation page.

> Render may ask for card details for the free plan. It is free and does not charge you,
> but if you don't want to add a card, use Azure for Students instead (see the end of this file).

---

## Step 2 – Frontend on Vercel (5 min)

1. Go to **https://vercel.com**, click **Sign up**, then **Continue with GitHub**.
2. Click **Add New…**, then **Project**, then **Import** next to **`Pixel_pipers`**.
3. Settings:
   - **Root Directory:** click **Edit** and choose **`Frontend`** ← important
   - **Framework Preset:** Vite (selected automatically)
   - Build command / output: leave the defaults
   - **Environment Variables:**

     | Key | Value |
     |---|---|
     | `VITE_SERVER_URL` | your Render URL, e.g. `https://pixel-pipers-api.onrender.com` (no `/` at the end) |
     | `VITE_ML_TOKEN` | value of API_TOKEN from `DEPLOY_SECRETS.txt` |

4. Click **Deploy**. After about 1 minute you get your link, e.g. `https://pixel-pipers.vercel.app`.

---

## Step 3 – Test

1. Open `<Render URL>/api-doc` first and wait until it loads. This wakes the backend up.
2. Open the Vercel link **on your phone**, upload a pipe photo and press **Send**.
3. Wait for the spinner (1–3 min on the free plan). You should get the count and the marked image.

---

## Updating later

| What changed | What to do |
|---|---|
| Any code | `git add .`, `git commit -m "..."`, `git push`. Render and Vercel both redeploy automatically. |
| Token | change `API_TOKEN` on Render **and** `VITE_ML_TOKEN` on Vercel, then on Vercel open **Deployments**, then **⋮**, then **Redeploy**. Vercel only reads env variables while building. |

---

## Troubleshooting

| Problem | Cause / fix |
|---|---|
| Website says "Error uploading image" | Check that `VITE_SERVER_URL` on Vercel is right, has no `/` at the end, and starts with `https://`. Redeploy after changing it. |
| Request returns **401** | `VITE_ML_TOKEN` (Vercel) and `API_TOKEN` (Render) are not the same. |
| Spinner runs for minutes | Normal on the free plan, especially right after the server wakes up. |
| Render build fails | Open **Logs**. Check that Root Directory is `Backend`. |
| Render log: **No credentials found** | `API_TOKEN` env variable is missing. Add it under **Environment**; Render restarts automatically. |
| Render log: **Out of memory** | Make sure there is no `WORKERS` variable set above 1 on the free plan. |
| Page refresh on Vercel shows 404 | `Frontend/vercel.json` handles this. Make sure Root Directory is `Frontend`. |

---

## Faster option: Azure for Students (free $100 credit, no card, needs a student email)

The same Docker image runs on Azure, which has a much faster CPU.

1. Sign up at https://azure.microsoft.com/free/students with your college email.
2. In the Azure Portal, create a **Container App** (or **Web App for Containers**) from the GitHub repo's
   `Backend/Dockerfile`. Set the same 3 environment variables, set `PORT=7860`, and you can set `WORKERS=2`.
3. Put the Azure URL into Vercel's `VITE_SERVER_URL` and redeploy.

## Paid option: Hugging Face Spaces

Docker Spaces need a **PRO** subscription (about $9/month). `Backend/make_hf_upload.ps1` builds the upload
folder for it, and `Backend/README.md` already has the Space settings block at the top.

## Test the backend image on your own PC (optional, Docker Desktop)

```powershell
cd Backend
docker build -t pixel-pipers-backend .
docker run -p 7860:7860 -e API_TOKEN=sk_test -e API_USERNAME=admin -e API_PASSWORD=secret pixel-pipers-backend
# open http://localhost:7860/api-doc
```

To test with the same limits as Render's free plan, add `--memory=512m --cpus=0.1`.
