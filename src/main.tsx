import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';
import App from './App.tsx';
import './index.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import { CedraWalletProvider } from './contexts/CedraWalletProvider';
import { AlertProvider } from './components/alert/AlertContext';
import { DAOStateProvider } from './contexts/DAOStateContext';
import { FilterProvider } from './contexts/FilterContext';

// Polyfill Buffer for mobile wallets
window.Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <CedraWalletProvider autoConnect={false}>
          <DAOStateProvider>
            <FilterProvider>
              <App />
            </FilterProvider>
          </DAOStateProvider>
        </CedraWalletProvider>
      </AlertProvider>
    </BrowserRouter>
  </StrictMode>
);
