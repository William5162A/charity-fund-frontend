import axios from 'axios';

// الرابط الأساسي للباك إند
const BASE_URL = 'http://127.0.0.1:8080/api/';

const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

const buildRequestConfig = (signal) => (signal ? { signal } : undefined);

// إنشاء نسخة مخصصة من Axios
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          throw new Error('لا يوجد مفتاح تجديد');
        }

        const res = await axios.post(`${BASE_URL}token/refresh/`, { refresh: refreshToken });

        localStorage.setItem('access_token', res.data.access);

        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


export const loginUser = async (email, password) => {
  try {
    const response = await api.post('token/', { email, password });
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || 'فشل الاتصال بالخادم. تأكد من صحة البيانات.';
    throw new Error(errorMessage);
  }
};


export const fetchAidRequests = async (signal) => {
  try {
    const response = await api.get('aid-requests/requests/', buildRequestConfig(signal));
    return asArray(response.data);
  } catch (error) {
    if (error.name === 'CanceledError' || signal?.aborted) {
      throw error;
    }
    throw new Error(error.response?.data?.detail || 'فشل جلب بيانات الطلبات من الخادم');
  }
};

export const fetchAidRequestDetails = async (id, signal) => {
  try {
    const response = await api.get(`aid-requests/requests/${id}/`, buildRequestConfig(signal));
    return response.data;
  } catch (error) {
    if (error.name === 'CanceledError' || signal?.aborted) {
      throw error;
    }
    throw error;
  }
};

export const updateRequestStatus = async (id, status) => {
  const response = await api.patch(`aid-requests/requests/${id}/`, { request_status: status });
  return response.data;
};

export const fetchPatientDetails = async (patientId, signal) => {
  try {
    const response = await api.get(`patients/${patientId}/`, buildRequestConfig(signal));
    return response.data;
  } catch (error) {
    if (error.name === 'CanceledError' || signal?.aborted) {
      throw error;
    }
    throw error;
  }
};

export const fetchPatientFamily = async (patientId, signal) => {
  try {
    const response = await api.get(`patients/${patientId}/family/`, buildRequestConfig(signal));
    return asArray(response.data);
  } catch (error) {
    if (error.name === 'CanceledError' || signal?.aborted) {
      throw error;
    }
    throw error;
  }
};

export const fetchAllProviders = async (signal) => {
  const response = await api.get('aid-providers/providers/', buildRequestConfig(signal));
  return asArray(response.data);
};

export const assignProviderToRequest = async (requestId, providerData) => {
  const response = await api.post(`aid-requests/requests/${requestId}/providers/`, providerData);
  return response.data;
};

export const fetchUsers = async (signal) => {
  try {
    const response = await api.get('users/', buildRequestConfig(signal));
    return asArray(response.data);
  } catch (error) {
    if (error.name === 'CanceledError' || signal?.aborted) {
      throw error;
    }
    throw new Error(error.response?.data?.detail || 'فشل جلب قائمة المستخدمين');
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('users/', userData);
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    const errorMsg = errData ? Object.values(errData).flat().join(' | ') : 'فشل إنشاء المستخدم';
    throw new Error(errorMsg);
  }
};

export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`users/${id}/`, userData);
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    const errorMsg = errData ? Object.values(errData).flat().join(' | ') : 'فشل تحديث المستخدم';
    throw new Error(errorMsg);
  }
};

export const deleteUserApi = async (id) => {
  try {
    const response = await api.delete(`users/${id}/`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'فشل حذف المستخدم');
  }
};


// ==========================================
// 🌟 دوال واجهة الطبيب الجديدة (EMR System)
// ==========================================

export const searchPatients = async (query, signal) => {
  try {
    const response = await api.get(`patients/?search=${query}`, buildRequestConfig(signal));
    return asArray(response.data);
  } catch (error) {
    if (error.name === 'CanceledError' || signal?.aborted) return [];
    throw new Error('فشل البحث في قاعدة بيانات المرضى.');
  }
};

export const fetchRequestsByPatientId = async (patientId) => {
  try {
    const response = await api.get(`aid-requests/requests/?patient=${patientId}`);
    const results = asArray(response.data);

    const strictResults = results.filter(req =>
      req.patient === patientId || req.patient?.id === patientId
    );

    return strictResults;
  } catch (error) {
    console.error('فشل جلب تاريخ المريض:', error);
    return [];
  }
};

export const createPatient = async (patientData) => {
  try {
    const response = await api.post('patients/', patientData);
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    if (errData?.national_number) {
      throw new Error('الرقم الوطني موجود مسبقاً في النظام. يرجى البحث عن المريض بدلاً من إضافته.');
    }
    const errorMsg = errData ? Object.values(errData).flat().join(' | ') : 'فشل إنشاء ملف المريض';
    throw new Error(errorMsg);
  }
};

export const createFamilyMember = async (patientId, memberData) => {
  const response = await api.post(`patients/${patientId}/family/`, memberData);
  return response.data;
};

export const createAidRequest = async (requestData) => {
  const response = await api.post('aid-requests/requests/', requestData);
  return response.data;
};

export const createProvider = async (providerData) => {
  const response = await api.post('aid-providers/providers/', providerData);
  return response.data;
};

export const updateProvider = async (id, providerData) => {
  const response = await api.put(`aid-providers/providers/${id}/`, providerData);
  return response.data;
};

export const deleteProvider = async (id) => {
  const response = await api.delete(`aid-providers/providers/${id}/`);
  return response.data;
};

export const fetchCategories = async (signal) => {
  const response = await api.get('aid-providers/categories/', buildRequestConfig(signal));
  return asArray(response.data);
};

export const createCategory = async (categoryData) => {
  const response = await api.post('aid-providers/categories/', categoryData);
  return response.data;
};

export const removeProviderFromRequest = async (contributionId) => {
  const response = await api.delete(`aid-requests/providers/${contributionId}/`);
  return response.data;
};

export const updateAidRequest = async (id, payload) => {
  const response = await api.patch(`aid-requests/requests/${id}/`, payload);
  return response.data;
};

export const updatePatientDetails = async (id, patientData) => {
  const response = await api.patch(`patients/${id}/`, patientData);
  return response.data;
};

export const addPatientFamilyMember = async (patientId, memberData) => {
  const payload = { ...memberData, patient: patientId };
  const response = await api.post('patient-family/', payload);
  return response.data;
};

export const updatePatientFamilyMember = async (memberId, memberData) => {
  const response = await api.patch(`patient-family/${memberId}/`, memberData);
  return response.data;
};

export const deletePatientFamilyMember = async (memberId) => {
  const response = await api.delete(`patient-family/${memberId}/`);
  return response.data;
};

export const deleteSystemUser = async (userId) => {
  const response = await api.delete(`users/${userId}/`);
  return response.data;
};

export default api;
