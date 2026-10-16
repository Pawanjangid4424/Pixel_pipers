# Deploying Pixel Pipers

The backend goes on **Hugging Face Spaces** and the frontend on **Vercel**. Both are free and need no credit card.

```
Anyone's phone / laptop
        │
        ▼
https://pixel-pipers.vercel.app            ← Frontend (Vercel, built from GitHub)
        │  POST /frontend  (image + token)
        ▼
https://<username>-pixel-pipers.hf.space   ← Backend (Hugging Face, Docker)
```

Do the steps **in this order**. The frontend needs the backend's URL.

---

## Step 0 – Make a new secret token (2 min)

The old token is visible in the code, so create a fresh one for the live site.
Run this in a terminal and copy the output:

```powershell
python -c "import secrets; print('sk_' + secrets.token_urlsafe(24))"
```

Also choose a username and password for the `/login` route. Keep all three in a notepad; you will need them in Steps 2 and 3.

---

## Step 1 – Upload the code to GitHub (10 min)

1. Create an account on **https://github.com** (skip this if you already have one).
2. Click **+** (top right), then **New repository**.
   - Name: `pixel-pipers`
   - Public
   - **Do NOT** tick "Add a README", "Add .gitignore" or "license". The project already has them.
   - Click **Create repository**.
3. Open a terminal in the project folder (`Pixel piper complete`) and run:

   ```powershell
   # one-time: tell git who you are (use your GitHub name + email)
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"

   git add .
   git commit -m "Pixel Pipers: frontend, backend, API docs"
   git remote add origin https://github.com/<your-username>/pixel-pipers.git
   git push -u origin main
   ```

   The first push opens a browser window to log in to GitHub.

> **Don't use GitHub's "upload files" button in the browser.** It ignores `.gitignore` and
> would upload `node_modules`, `.env` and `credentials.json`.
> `.gitignore` already keeps these out: `Frontend/.env`, `credentials.json`, `node_modules`,
> `_unused_files`, `hf_upload` and the `runs/` temp folder.

---

## Step 2 – Backend on Hugging Face Spaces (15–20 min)

### 2.1 Create the Space

1. Create an account on **https://huggingface.co**.
2. Click your profile picture, then **New Space**.
   - Space name: `pixel-pipers`
   - SDK: **Docker**, then **Blank**
   - Hardware: **CPU basic (free)**
   - Visibility: **Public** (it must be public so the website can call it)
   - Click **Create Space**.

### 2.2 Add the secrets (before uploading)

In the Space, go to **Settings**, then **Variables and secrets**, then **New secret**. Add these three:

| Name | Value |
|---|---|
| `API_TOKEN` | the token from Step 0 |
| `API_USERNAME` | your username from Step 0 |
| `API_PASSWORD` | your password from Step 0 |

The values are hidden from visitors. `app.py` reads them instead of `credentials.json`.

### 2.3 Prepare and upload the files

1. In the `Backend` folder, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\make_hf_upload.ps1
   ```

   This creates the folder `Pixel piper complete\hf_upload` with **only** the files the Space needs
   (no `credentials.json`, no old models).
2. In the Space, open the **Files** tab, then **+ Contribute**, then **Upload files**.
3. Open the `hf_upload` folder in Explorer. Select **everything inside it** (`Dockerfile`, `.dockerignore`,
   `README.md` and the `PIPE_model` folder) and drag it into the browser.
4. Click **Commit changes to main**.

### 2.4 Wait for the build

- Open the **Logs** tab and watch the build. The first build takes about **10 minutes** (it installs PyTorch).
- When the status at the top turns **Running**, the backend is live.
- Your backend URL is `https://<your-username>-pixel-pipers.hf.space`.
  To check it, open the **⋮** menu, then **Embed this Space**, then **Direct URL**.
- Test it: open `https://<your-username>-pixel-pipers.hf.space/api-doc` in the browser.
  You should see the API documentation page.

---

## Step 3 – Frontend on Vercel (5 min)

1. Go to **https://vercel.com** and choose **Sign up**, then **Continue with GitHub**.
2. Click **Add New…**, then **Project**, then **Import** next to the `pixel-pipers` repository.
3. Settings:
   - **Root Directory:** click **Edit** and choose **`Frontend`** ← important
   - **Framework Preset:** Vite (selected automatically)
   - Build command / output: leave the defaults (`npm run build`, `dist`)
   - **Environment Variables:** add both of these:

     | Key | Value |
     |---|---|
     | `VITE_SERVER_URL` | `https://<your-username>-pixel-pipers.hf.space` (no `/` at the end) |
     | `VITE_ML_TOKEN` | the token from Step 0 (same as `API_TOKEN`) |

4. Click **Deploy**. After about 1 minute you get your link, e.g. `https://pixel-pipers.vercel.app`.

---

## Step 4 – Test

1. Open the Vercel link **on your phone**.
2. Upload a pipe photo and press **Send**. You should get the count and the marked image.
3. If the Space was sleeping, the first request can take about 1 minute. After that it's fast.

---

## Updating later

| What changed | What to do |
|---|---|
| Frontend code | `git add .`, `git commit -m "..."`, `git push`. Vercel redeploys automatically. |
| Backend code | push to GitHub too, then run `make_hf_upload.ps1` again and upload the changed files to the Space. It rebuilds automatically. |
| Token | change `API_TOKEN` on Hugging Face **and** `VITE_ML_TOKEN` on Vercel, then on Vercel open **Deployments**, then **⋮**, then **Redeploy**. Vercel only reads env variables while building. |

---

## Troubleshooting

| Problem | Cause / fix |
|---|---|
| Website says "Error uploading image" | Check that `VITE_SERVER_URL` on Vercel is right, has no `/` at the end, and starts with `https://`. Redeploy after changing it. |
| Request returns **401** | `VITE_ML_TOKEN` (Vercel) and `API_TOKEN` (Hugging Face) are not the same. |
| First request very slow | The Space was asleep (it sleeps after about 48 h with no visitors). Wait about 1 minute. |
| Space shows **Build error** | Open the **Logs** tab. Check that `Dockerfile` and `README.md` are at the **top level** of the Space, not inside a folder. |
| Space shows **Runtime error: No credentials found** | The `API_TOKEN` secret is missing (Step 2.2). Add it, then click **Restart Space** in Settings. |
| Page refresh on Vercel shows 404 | `Frontend/vercel.json` handles this. Make sure Root Directory is `Frontend`. |

## Test the backend image on your own PC (optional, needs Docker Desktop)

```powershell
cd Backend
docker build -t pixel-pipers-backend .
docker run -p 7860:7860 -e API_TOKEN=sk_test -e API_USERNAME=admin -e API_PASSWORD=secret pixel-pipers-backend
# open http://localhost:7860/api-doc
```

If it works here, it works on Hugging Face. They build the same Dockerfile.
