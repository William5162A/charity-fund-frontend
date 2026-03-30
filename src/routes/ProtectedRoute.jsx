import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const userRole = localStorage.getItem('userRole');

  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    // 🌟 توجيه ذكي حسب الصلاحية الفعلية
    if (userRole === 'owner') return <Navigate to="/owner" replace />;
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'doctor') return <Navigate to="/doctor" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}