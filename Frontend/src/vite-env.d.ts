/// <reference types="vite/client" />
// Types for the variables in Frontend/.env (only VITE_* variables reach the browser)
interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string; // Flask backend URL, e.g. http://localhost:5001
  readonly VITE_ML_TOKEN: string; // must match "token" in Backend/PIPE_model/credentials.json
  readonly VITE_CLOUD_NAME: string;
  readonly VITE_UPLOAD_PRESET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
