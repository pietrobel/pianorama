import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { initPWAUpdates } from './pwa/pwaUpdateManager.ts';

initPWAUpdates({ registerSW });

createRoot(document.getElementById('root')!).render(<App />);
