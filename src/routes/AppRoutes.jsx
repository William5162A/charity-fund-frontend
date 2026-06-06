import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { ROLES } from '../context/AuthContext';

// استيراد الصفحات
import Login from '../pages/auth/Login';
import Dashboard from '../pages/admin/Dashboard';
import DoctorForm from '../pages/doctor/DoctorForm';
import RequestDetails from '../pages/admin/RequestDetails';
import RequestsList from '../pages/admin/RequestsList';
import UsersManager from '../pages/admin/UsersManager';
import Reports from '../pages/admin/Reports';
import Supporters from '../pages/admin/Supporters';
import SupportersManager from '../pages/admin/SupportersManager';
import PatientDetails from '../pages/admin/PatientDetails';

// تجميع الصفحات المشتركة
const ManagementRoutes = () => (
  <Routes>
    <Route path="" element={<Dashboard />} />
    <Route path="request/:id" element={<RequestDetails />} />
    <Route path="new-requests" element={<RequestsList key="new" />} />
    <Route path="completed" element={<RequestsList key="completed" />} />
    {/* ملاحظة أمنية: مسارات users و supporters-manager ستكون متاحة كمسار للجنة، لكن الباك إند سيرفض طلباتهم بـ 403 */}
    <Route path="users" element={<UsersManager />} />
    <Route path="reports" element={<Reports />} />
    <Route path="supporters" element={<Supporters />} />
    <Route path="supporters-manager" element={<SupportersManager />} />
  </Routes>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* مسار الطبيب */}
      <Route path="/doctor/*" element={
        <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
          <DoctorForm />
        </ProtectedRoute>
      } />

      {/* 🌟 المسار الجديد للجنة الإدارية */}
      <Route path="/processor/*" element={
        <ProtectedRoute allowedRoles={[ROLES.PROCESSOR]}>
          <ManagementRoutes />
        </ProtectedRoute>
      } />

      <Route path="/admin/create-request" element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
          <DoctorForm />
        </ProtectedRoute>
      } />

      <Route path="/admin/patients/:id" element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
          <PatientDetails />
        </ProtectedRoute>
      } />

      {/* 🌟 المسار الجديد للمدير العام */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
          <ManagementRoutes />
        </ProtectedRoute>
      } />

      {/* أي مسار غير معروف يوجه لصفحة الدخول */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
