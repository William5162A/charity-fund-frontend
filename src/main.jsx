import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// استيراد مزود الحسابات الذي أنشأناه للتو
import { AuthProvider } from './context/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* تغليف التطبيق بالكامل ليحصل على الذاكرة المركزية */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)