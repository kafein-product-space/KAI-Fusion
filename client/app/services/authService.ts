// Auth Service Template
import axios from 'axios';

const API_BASE_URL = '/api/auth'; // Gerekirse endpointi değiştir

export const login = async (data: any) => {
  // Kullanıcı girişi
  return axios.post(`${API_BASE_URL}/login`, data);
};

export const register = async (data: any) => {
  // Kullanıcı kaydı
  return axios.post(`${API_BASE_URL}/register`, data);
};

export const getProfile = async () => {
  // Kullanıcı profilini getir
  return axios.get(`${API_BASE_URL}/profile`);
};

// Diğer auth işlemleri için fonksiyonlar eklenebilir 