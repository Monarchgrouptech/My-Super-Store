import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './styles/index.css';
import { CurrencyProvider } from './context/CurrencyContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <CurrencyProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </CurrencyProvider>
    </StrictMode>
);

// Register Service Worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

