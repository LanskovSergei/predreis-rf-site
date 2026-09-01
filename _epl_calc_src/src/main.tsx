import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DemoApp } from './App';
import './styles.css';
import './pdfForms.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
);
