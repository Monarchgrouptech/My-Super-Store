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
    </StrictMode>,
);
