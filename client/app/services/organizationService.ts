// Organization Service Template
import axios from 'axios';

const API_BASE_URL = '/api/organization';

export const getOrganizations = async () => {
  return axios.get(API_BASE_URL);
};

export const getOrganizationById = async (id: string | number) => {
  return axios.get(`${API_BASE_URL}/${id}`);
};

export const createOrganization = async (data: any) => {
  return axios.post(API_BASE_URL, data);
};

export const updateOrganization = async (id: string | number, data: any) => {
  return axios.put(`${API_BASE_URL}/${id}`, data);
};

export const deleteOrganization = async (id: string | number) => {
  return axios.delete(`${API_BASE_URL}/${id}`);
}; 