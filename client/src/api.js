import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
});

// chave usada no storage
const TOKEN_KEY = 'token';

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Inicializa Authorization se já houver token salvo
const existing = getStoredToken();
if (existing) {
  api.defaults.headers.common['Authorization'] = `Bearer ${existing}`;
}

export default api;
