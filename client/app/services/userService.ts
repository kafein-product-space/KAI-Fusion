// User Service Template
import axios from 'axios';

const API_BASE_URL = '/api/user';

export const getUsers = async () => {
  return axios.get(API_BASE_URL);
};

export const getUserById = async (id: string | number) => {
  return axios.get(`${API_BASE_URL}/${id}`);
};

export const createUser = async (data: any) => {
  return axios.post(API_BASE_URL, data);
};

export const updateUser = async (id: string | number, data: any) => {
  return axios.put(`${API_BASE_URL}/${id}`, data);
};

export const deleteUser = async (id: string | number) => {
  return axios.delete(`${API_BASE_URL}/${id}`);
}; 