import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // 🌟 تحديث مسارات إعادة التوجيه الصارمة لتتطابق مع المسارات الجديدة في AppRoutes
    if (user.role === ROLES.ADMIN) return <Navigate to="/admin" replace />;
    if (user.role === ROLES.PROCESSOR) return <Navigate to="/processor" replace />;
    if (user.role === ROLES.DOCTOR) return <Navigate to="/doctor" replace />;
    
    return <Navigate to="/" replace />;
  }

  return children;
}