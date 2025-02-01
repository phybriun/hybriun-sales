import axios from 'axios';

const api = axios.create({
  baseURL: 'https://n8n.hybriun.com.br/webhook/budget/software',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth');
  if (auth) {
    const { token } = JSON.parse(auth);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;