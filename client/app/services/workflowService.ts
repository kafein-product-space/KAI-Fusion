// Workflow Service Template
import axios from 'axios';

const API_BASE_URL = '/api/workflow';

export const getWorkflows = async () => {
  return axios.get(API_BASE_URL);
};

export const getWorkflowById = async (id: string | number) => {
  return axios.get(`${API_BASE_URL}/${id}`);
};

export const createWorkflow = async (data: any) => {
  return axios.post(API_BASE_URL, data);
};

export const updateWorkflow = async (id: string | number, data: any) => {
  return axios.put(`${API_BASE_URL}/${id}`, data);
};

export const deleteWorkflow = async (id: string | number) => {
  return axios.delete(`${API_BASE_URL}/${id}`);
}; 