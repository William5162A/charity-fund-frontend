import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import GlobalHeader from './components/layout/GlobalHeader';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <div dir="rtl" className="app-shell font-sans">
        <GlobalHeader />
        <main>
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}