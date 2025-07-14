import { apiClient } from '~/lib/api-client';
import { API_ENDPOINTS } from '~/lib/config';
import type { 
  NodeMetadata,
  NodeCategory,
  CustomNode,
  CustomNodeCreateRequest
} from '~/types/api';

export class NodeService {
  /**
   * Get all available nodes
   */
  static async getNodes(): Promise<NodeMetadata[]> {
    try {
      const response = await apiClient.get<NodeMetadata[]>(API_ENDPOINTS.NODES.LIST);
      return response;
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      throw error;
    }
  }

  /**
   * Get node categories
   */
  static async getNodeCategories(): Promise<NodeCategory[]> {
    try {
      return await apiClient.get<NodeCategory[]>(API_ENDPOINTS.NODES.CATEGORIES);
    } catch (error) {
      console.error('Failed to fetch node categories:', error);
      throw error;
    }
  }

  /**
   * Get custom nodes for the current user
   */
  static async getCustomNodes(): Promise<CustomNode[]> {
    try {
      return await apiClient.get<CustomNode[]>(API_ENDPOINTS.NODES.CUSTOM);
    } catch (error) {
      console.error('Failed to fetch custom nodes:', error);
      throw error;
    }
  }

  /**
   * Get a specific custom node by ID
   */
  static async getCustomNode(id: string): Promise<CustomNode> {
    try {
      return await apiClient.get<CustomNode>(API_ENDPOINTS.NODES.GET_CUSTOM(id));
    } catch (error) {
      console.error(`Failed to fetch custom node ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new custom node
   */
  static async createCustomNode(data: CustomNodeCreateRequest): Promise<CustomNode> {
    try {
      return await apiClient.post<CustomNode>(API_ENDPOINTS.NODES.CUSTOM, data);
    } catch (error) {
      console.error('Failed to create custom node:', error);
      throw error;
    }
  }

  /**
   * Update an existing custom node
   */
  static async updateCustomNode(id: string, data: Partial<CustomNodeCreateRequest>): Promise<CustomNode> {
    try {
      return await apiClient.put<CustomNode>(API_ENDPOINTS.NODES.GET_CUSTOM(id), data);
    } catch (error) {
      console.error(`Failed to update custom node ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a custom node
   */
  static async deleteCustomNode(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.NODES.GET_CUSTOM(id));
    } catch (error) {
      console.error(`Failed to delete custom node ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get nodes by category
   */
  static async getNodesByCategory(category: string): Promise<NodeMetadata[]> {
    try {
      const allNodes = await this.getNodes();
      return allNodes.filter(node => node.category === category);
    } catch (error) {
      console.error(`Failed to fetch nodes for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Search nodes by name or description
   */
  static async searchNodes(query: string): Promise<NodeMetadata[]> {
    try {
      const allNodes = await this.getNodes();
      const lowercaseQuery = query.toLowerCase();
      
      return allNodes.filter(node => 
        node.name.toLowerCase().includes(lowercaseQuery) ||
        node.display_name.toLowerCase().includes(lowercaseQuery) ||
        node.description.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error(`Failed to search nodes with query "${query}":`, error);
      throw error;
    }
  }
}

export default NodeService; 