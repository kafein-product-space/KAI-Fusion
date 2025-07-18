import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/config';
import type { ChatMessage, ChatMessageInput } from '../types/api';

// Tüm chatleri getir (chatflow_id'ye göre gruplanmış)
export const getAllChats = async (): Promise<Record<string, ChatMessage[]>> => {
  return apiClient.get(API_ENDPOINTS.CHAT.LIST);
};

// Yeni chat başlat
export const startNewChat = async (content: string): Promise<ChatMessage[]> => {
  return apiClient.post(API_ENDPOINTS.CHAT.CREATE, { content });
};

// Belirli bir chatin mesajlarını getir
export const getChatMessages = async (chatflow_id: string): Promise<ChatMessage[]> => {
  return apiClient.get(API_ENDPOINTS.CHAT.GET(chatflow_id));
};

// Chat'e mesaj gönder (interact)
export const interactWithChat = async (chatflow_id: string, content: string): Promise<ChatMessage[]> => {
  return apiClient.post(API_ENDPOINTS.CHAT.INTERACT(chatflow_id), { content });
};

// Mesajı güncelle
export const updateChatMessage = async (chat_message_id: string, content: string): Promise<ChatMessage[]> => {
  return apiClient.put(API_ENDPOINTS.CHAT.UPDATE(chat_message_id), { content });
};

// Mesajı sil
export const deleteChatMessage = async (chat_message_id: string): Promise<{ detail: string }> => {
  return apiClient.delete(API_ENDPOINTS.CHAT.DELETE(chat_message_id));
}; 