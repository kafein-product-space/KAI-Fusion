import { create } from 'zustand';
import type { ChatMessage } from '../types/api';
import * as chatService from '../services/chatService';
import workflowsService from '../services/workflows';

interface ChatStore {
  chats: Record<string, ChatMessage[]>;
  activeChatflowId: string | null;
  loading: boolean;
  error: string | null;
  fetchAllChats: () => Promise<void>;
  startNewChat: (content: string) => Promise<void>;
  fetchChatMessages: (chatflow_id: string) => Promise<void>;
  interactWithChat: (chatflow_id: string, content: string) => Promise<void>;
  setActiveChatflowId: (chatflow_id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addMessage: (chatflow_id: string, message: ChatMessage) => void;
  updateMessage: (chatflow_id: string, message: ChatMessage) => void;
  removeMessage: (chatflow_id: string, message_id: string) => void;
  clearMessages: (chatflow_id: string) => void;
  // LLM entegrasyonu:
  startLLMChat: (flow_data: any, input_text: string, workflow_id: string) => Promise<void>;
  sendLLMMessage: (flow_data: any, input_text: string, chatflow_id: string, workflow_id: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: {},
  activeChatflowId: null,
  loading: false,
  error: null,
  fetchAllChats: async () => {
    set({ loading: true, error: null });
    try {
      const chats = await chatService.getAllChats();
      set({ chats, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Chatleri alırken hata', loading: false });
    }
  },
  startNewChat: async (content) => {
    set({ loading: true, error: null });
    try {
      const messages = await chatService.startNewChat(content);
      if (messages.length > 0) {
        const chatflow_id = messages[0].chatflow_id;
        set((state) => ({
          chats: { ...state.chats, [chatflow_id]: messages },
          activeChatflowId: chatflow_id,
          loading: false,
        }));
      } else {
        set({ loading: false });
      }
    } catch (e: any) {
      set({ error: e.message || 'Yeni chat başlatılamadı', loading: false });
    }
  },
  fetchChatMessages: async (chatflow_id) => {
    set({ loading: true, error: null });
    try {
      const messages = await chatService.getChatMessages(chatflow_id);
      set((state) => ({
        chats: { ...state.chats, [chatflow_id]: messages },
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Mesajlar alınamadı', loading: false });
    }
  },
  interactWithChat: async (chatflow_id, content) => {
    set({ loading: true, error: null });
    try {
      const messages = await chatService.interactWithChat(chatflow_id, content);
      set((state) => ({
        chats: { ...state.chats, [chatflow_id]: messages },
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Mesaj gönderilemedi', loading: false });
    }
  },
  setActiveChatflowId: (chatflow_id) => set({ activeChatflowId: chatflow_id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addMessage: (chatflow_id, message) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [chatflow_id]: [...(state.chats[chatflow_id] || []), message],
      },
    })),
  updateMessage: (chatflow_id, message) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [chatflow_id]: (state.chats[chatflow_id] || []).map((m) =>
          m.id === message.id ? message : m
        ),
      },
    })),
  removeMessage: (chatflow_id, message_id) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [chatflow_id]: (state.chats[chatflow_id] || []).filter((m) => m.id !== message_id),
      },
    })),
  clearMessages: (chatflow_id) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [chatflow_id]: [],
      },
    })),
  // LLM entegrasyonu:
  startLLMChat: async (flow_data, input_text, workflow_id) => {
    set({ loading: true, error: null });
    const chatflow_id = crypto.randomUUID();
    get().setActiveChatflowId(chatflow_id);
    try {
      await workflowsService.executeAdhocWorkflow({ flow_data, input_text, session_id: chatflow_id, workflow_id });
      await get().fetchChatMessages(chatflow_id);
    } catch (e: any) {
      set({ error: e.message || 'LLM ile konuşma başlatılamadı' });
    } finally {
      set({ loading: false });
    }
  },
  sendLLMMessage: async (flow_data, input_text, chatflow_id, workflow_id) => {
    set({ loading: true, error: null });
    try {
      await workflowsService.executeAdhocWorkflow({ flow_data, input_text, session_id: chatflow_id, workflow_id });
      await get().fetchChatMessages(chatflow_id);
    } catch (e: any) {
      set({ error: e.message || 'Mesaj gönderilemedi' });
    } finally {
      set({ loading: false });
    }
  },
})); 