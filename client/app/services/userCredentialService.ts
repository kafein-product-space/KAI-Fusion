// User Credential Service Template
import axios from 'axios';

const API_BASE_URL = '/api/user-credential';

export const getUserCredentials = async () => {
  return axios.get(API_BASE_URL);
};

export const getUserCredentialById = async (id: string | number) => {
  return axios.get(`${API_BASE_URL}/${id}`);
};

export const createUserCredential = async (data: any) => {
  return axios.post(API_BASE_URL, data);
};

export const updateUserCredential = async (id: string | number, data: any) => {
  return axios.put(`${API_BASE_URL}/${id}`, data);
};

export const deleteUserCredential = async (id: string | number) => {
  return axios.delete(`${API_BASE_URL}/${id}`);
}; 