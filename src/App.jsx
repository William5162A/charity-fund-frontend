import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import GlobalHeader from './components/layout/GlobalHeader';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <div dir="rtl" className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <GlobalHeader />
        <main>
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}