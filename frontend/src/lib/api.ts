import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // If data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log('FormData detected, removed Content-Type header');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 if we're already on the login page
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isLoginPage = window.location.pathname === '/auth/login';
        if (!isLoginPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  registerTenant: (data: any) =>
    api.post('/auth/register/tenant', data),
  registerOwner: (data: any) =>
    api.post('/auth/register/owner', data),
  getCurrentUser: () =>
    api.get('/auth/me'),
  updateProfile: (data: any) =>
    api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string; confirmPassword?: string }) =>
    api.post('/auth/reset-password', data),
  logout: () =>
    api.post('/auth/logout'),
  sendOTP: (mobile: string) =>
    api.post('/auth/otp/send', { mobile }),
  verifyOTP: (mobile: string, otp: string) =>
    api.post('/auth/otp/verify', { mobile, otp }),
};

// Properties API
export const propertiesAPI = {
  getAll: (params?: any) =>
    api.get('/properties', { params }),
  search: (params?: any) =>
    api.get('/properties/search', { params }),
  getById: (id: string) =>
    api.get(`/properties/${id}`),
  create: (data: any) =>
    api.post('/properties', data),
  update: (id: string, data: any) =>
    api.put(`/properties/${id}`, data),
  delete: (id: string) =>
    api.delete(`/properties/${id}`),
  addImages: (id: string, data: any) =>
    api.post(`/properties/${id}/images`, data),
  addToFavorites: (id: string) =>
    api.post(`/properties/${id}/favorite`),
  removeFromFavorites: (id: string) =>
    api.delete(`/properties/${id}/favorite`),
  getFavorites: () =>
    api.get('/properties/favorites/list'),
};

// Upload API
export const uploadAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    console.log('Uploading image:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      formDataHasImage: formData.has('image')
    });
    // The interceptor will handle removing Content-Type for FormData
    return api.post('/upload/image', formData, {
      timeout: 30000, // 30 seconds
    });
  },
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    console.log('Uploading document:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      formDataHasDocument: formData.has('document')
    });
    // The interceptor will handle removing Content-Type for FormData
    return api.post('/upload/document', formData, {
      timeout: 30000, // 30 seconds
    });
  },
};

// Move Permit API
export const movePermitAPI = {
  createTenantPermit: (data: any) =>
    api.post('/tenant/move-permits', data),
  getTenantPermits: (params?: any) =>
    api.get('/tenant/move-permits', { params }),
  getTenantPermitById: (id: string) =>
    api.get(`/tenant/move-permits/${id}`),
  cancelTenantPermit: (id: string) =>
    api.put(`/tenant/move-permits/${id}/cancel`),
  getOwnerPermits: (params?: any) =>
    api.get('/owner/move-permits', { params }),
  updateOwnerPermitStatus: (id: string, data: any) =>
    api.put(`/owner/move-permits/${id}/status`, data),
};

// Applications API
export const applicationsAPI = {
  create: (data: any) =>
    api.post('/applications', data),
  getAll: () =>
    api.get('/applications'),
  getById: (id: string) =>
    api.get(`/applications/${id}`),
  update: (id: string, data: any) =>
    api.put(`/applications/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.put(`/applications/${id}/status`, { status }),
};

// Chat API
export const chatAPI = {
  getOrCreateRoom: (data: { recipientId: string; recipientType: string; roomType: string }) =>
    api.post('/chat/rooms', data),
  getRooms: () =>
    api.get('/chat/rooms'),
  getMessages: (roomId: string, params?: any) =>
    api.get(`/chat/rooms/${roomId}/messages`, { params }),
  sendMessage: (data: { roomId: string; message: string; messageType?: string; attachmentUrl?: string }) =>
    api.post('/chat/messages', data),
  markAsRead: (roomId: string) =>
    api.put(`/chat/rooms/${roomId}/read`),
  getUnreadCount: () =>
    api.get('/chat/unread-count'),
};

// Viewings API
export const viewingsAPI = {
  create: (data: any) =>
    api.post('/viewings', data),
  getAll: () =>
    api.get('/viewings'),
  getById: (id: string) =>
    api.get(`/viewings/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/viewings/${id}/status`, { status }),
  cancel: (id: string) =>
    api.put(`/viewings/${id}/cancel`),
};

// Contact API
export const contactAPI = {
  submit: (data: { name: string; email: string; phone?: string; subject: string; message: string }) =>
    api.post('/contact/submit', data),
  getAllMessages: (params?: any) =>
    api.get('/contact/messages', { params }),
  getMessage: (id: string) =>
    api.get(`/contact/messages/${id}`),
  markAsRead: (id: string) =>
    api.patch(`/contact/messages/${id}/read`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/contact/messages/${id}/status`, { status }),
  delete: (id: string) =>
    api.delete(`/contact/messages/${id}`),
};

// Tenant API
export const tenantAPI = {
  getDashboard: () =>
    api.get('/tenant/dashboard'),
  getProfile: () =>
    api.get('/tenant/profile'),
  updateProfile: (data: any) =>
    api.put('/tenant/profile', data),
  getApplications: () =>
    api.get('/tenant/applications'),
  getLeases: (params?: any) =>
    api.get('/tenant/leases', { params }),
  getMaintenanceRequests: () =>
    api.get('/tenant/maintenance-requests'),
  createMaintenanceRequest: (data: any) =>
    api.post('/tenant/maintenance-requests', data),
  getMovePermits: (params?: any) =>
    api.get('/tenant/move-permits', { params }),
  createMovePermit: (data: any) =>
    api.post('/tenant/move-permits', data),
  getMovePermitById: (id: string) =>
    api.get(`/tenant/move-permits/${id}`),
  cancelMovePermit: (id: string) =>
    api.put(`/tenant/move-permits/${id}/cancel`),
};

// Owner API
export const ownerAPI = {
  getDashboard: () =>
    api.get('/owner/dashboard'),
  getProperties: (params?: any) =>
    api.get('/owner/properties', { params }),
  getTenants: () =>
    api.get('/owner/tenants'),
  getTenantById: (id: string) =>
    api.get(`/owner/tenants/${id}`),
  createTenant: (data: any) =>
    api.post('/owner/tenants', data),
  updateTenant: (id: string, data: any) =>
    api.put(`/owner/tenants/${id}`, data),
  getApplications: (params?: any) =>
    api.get('/owner/applications', { params }),
  getLeases: (params?: any) =>
    api.get('/owner/leases', { params }),
  updateLeaseContract: (id: string, data: any) =>
    api.put(`/owner/leases/${id}/contract`, data),
  getFinancials: (params?: any) =>
    api.get('/owner/financials', { params }),
  getMaintenanceRequests: (params?: any) =>
    api.get('/owner/maintenance-requests', { params }),
  updateMaintenanceRequest: (id: string, data: { status: string; assignedTo?: string }) =>
    api.put(`/owner/maintenance-requests/${id}`, data),
  getMovePermits: (params?: any) =>
    api.get('/owner/move-permits', { params }),
  updateMovePermitStatus: (id: string, data: { status: string; statusReason?: string }) =>
    api.put(`/owner/move-permits/${id}/status`, data),
};

export const rentPaymentsAPI = {
  getPayments: (params?: any) =>
    api.get('/rent-payments', { params }),
  updateStatus: (id: string, data: any) =>
    api.put(`/rent-payments/${id}/status`, data),
  create: (data: any) =>
    api.post('/rent-payments', data),
  getPaymentHistory: (params?: any) =>
    api.get('/rent-payments/history', { params }),
};

// Admin API
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),
  getOwners: (params?: any) =>
    api.get('/admin/owners', { params }),
  getPendingOwners: () =>
    api.get('/admin/owners/pending'),
  approveOwner: (id: string) =>
    api.put(`/admin/owners/${id}/approve`),
  rejectOwner: (id: string, reason?: string) =>
    api.put(`/admin/owners/${id}/reject`, { reason }),
  getAllProperties: (params?: any) =>
    api.get('/admin/properties', { params }),
  getAllApplications: (params?: any) =>
    api.get('/admin/applications', { params }),
  getAllTenants: (params?: any) =>
    api.get('/admin/tenants', { params }),
  updatePropertyStatus: (id: string, status: string) =>
    api.put(`/admin/properties/${id}/status`, { status }),
};

