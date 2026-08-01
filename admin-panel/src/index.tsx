// admin-panel/src/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// فونت وزیرمتن (self-hosted — بدون وابستگی به CDN)
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
