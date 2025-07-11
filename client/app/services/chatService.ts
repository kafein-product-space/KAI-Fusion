// Chat Service Template
import axios from 'axios';

const API_BASE_URL = '/api/chat';

export const getChats = async () => {
  return axios.get(API_BASE_URL);
};

export const getChatById = async (id: string | number) => {
  return axios.get(`${API_BASE_URL}/${id}`);
};

export const createChat = async (data: any) => {
  return axios.post(API_BASE_URL, data);
};

export const updateChat = async (id: string | number, data: any) => {
  return axios.put(`${API_BASE_URL}/${id}`, data);
};

export const deleteChat = async (id: string | number) => {
  return axios.delete(`${API_BASE_URL}/${id}`);
}; 