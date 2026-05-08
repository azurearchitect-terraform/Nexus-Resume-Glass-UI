import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { FormattingProvider } from './context/FormattingContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <FormattingProvider>
        <App />
      </FormattingProvider>
    </BrowserRouter>
  </StrictMode>,
);
