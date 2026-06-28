/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOYMENT_ID?: string;
  readonly VITE_SITE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
