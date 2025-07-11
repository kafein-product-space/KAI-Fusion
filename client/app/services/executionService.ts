// Execution Service Template
import axios from 'axios';

const API_BASE_URL = '/api/execution';

export const getExecutions = async () => {
  return axios.get(API_BASE_URL);
};

export const getExecutionById = async (id: string | number) => {
  return axios.get(`${API_BASE_URL}/${id}`);
};

export const createExecution = async (data: any) => {
  return axios.post(API_BASE_URL, data);
};

export const updateExecution = async (id: string | number, data: any) => {
  return axios.put(`${API_BASE_URL}/${id}`, data);
};

export const deleteExecution = async (id: string | number) => {
  return axios.delete(`${API_BASE_URL}/${id}`);
}; 