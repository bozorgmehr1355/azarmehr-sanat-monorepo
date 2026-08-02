/// <reference types="vite/client" />

declare module '*.css';
declare module '*.scss';

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
