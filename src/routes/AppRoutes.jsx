import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

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

// 🌟 الحيلة الذكية: تجميع الصفحات المشتركة في مكون واحد لمنع تكرار الكود
const ManagementRoutes = () => (
  <Routes>
    <Route path="" element={<Dashboard />} />
    <Route path="request/:id" element={<RequestDetails />} />
    <Route path="new-requests" element={<RequestsList key="new" />} />
    <Route path="completed" element={<RequestsList key="completed" />} />
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
      <Route path="/doctor" element={
        <ProtectedRoute allowedRoles={['doctor']}><DoctorForm /></ProtectedRoute>
      } />
      
      {/* 🌟 مسار الأدمن (محمي للأدمن فقط) */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}><ManagementRoutes /></ProtectedRoute>
      } />
      
      {/* 🌟 مسار المالك الجديد (محمي للمالك فقط) */}
      <Route path="/owner/*" element={
        <ProtectedRoute allowedRoles={['owner']}><ManagementRoutes /></ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}