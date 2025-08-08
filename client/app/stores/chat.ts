import { create } from 'zustand';
import type { ChatMessage } from '../types/api';
import * as chatService from '../services/chatService';
import { executeWorkflow } from '../services/workflowService';

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
  loadChatHistory: () => Promise<void>;
  // LLM entegrasyonu:
  startLLMChat: (flow_data: any, input_text: string, workflow_id: string) => Promise<void>;
  sendLLMMessage: (flow_data: any, input_text: string, chatflow_id: string, workflow_id: string) => Promise<void>;
  sendEditedMessage: (flow_data: any, input_text: string, chatflow_id: string, workflow_id: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: {},
  activeChatflowId: null,
  loading: false,
  error: null,

  fetchAllChats: async () => {
    set({ loading: true, error: null });
    try {
      const allChats = await chatService.getAllChats();
      set((state) => ({
        chats: { ...state.chats, ...allChats },
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Chat geçmişi yüklenemedi', loading: false });
    }
  },

  loadChatHistory: async () => {
    set({ loading: true, error: null });
    try {
      const allChats = await chatService.getAllChats();
      set((state) => ({
        chats: { ...state.chats, ...allChats },
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Chat geçmişi yüklenemedi', loading: false });
    }
  },

  startNewChat: async (content) => {
    set({ loading: true, error: null });
    try {
      const messages = await chatService.startNewChat(content);
      const chatflow_id = messages[0]?.chatflow_id;
      if (chatflow_id) {
        set((state) => ({
          chats: { ...state.chats, [chatflow_id]: messages },
          activeChatflowId: chatflow_id,
          loading: false,
        }));
      }
    } catch (e: any) {
      set({ error: e.message || 'Yeni chat başlatılamadı', loading: false });
    }
  },

  fetchChatMessages: async (chatflow_id) => {
    set({ loading: true, error: null });
    try {
      const messages = await chatService.getChatMessages(chatflow_id);
      set((state) => {
        const existingMessages = state.chats[chatflow_id] || [];
        const existingIds = new Set(existingMessages.map(m => m.id));
        const existingContents = new Set(existingMessages.map(m => `${m.role}:${m.content}`));
        
        // Only add new messages that don't already exist (by ID or content+role)
        const newMessages = messages.filter(m => 
          !existingIds.has(m.id) && 
          !existingContents.has(`${m.role}:${m.content}`)
        );
        const mergedMessages = [...existingMessages, ...newMessages];
        
        return {
          chats: { ...state.chats, [chatflow_id]: mergedMessages },
          loading: false,
        };
      });
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
    set((state) => {
      const existingMessages = state.chats[chatflow_id] || [];
      const existingIds = new Set(existingMessages.map(m => m.id));
      const existingContents = new Set(existingMessages.map(m => `${m.role}:${m.content}`));
      
      // Don't add if message already exists (by ID or content+role)
      if (existingIds.has(message.id) || existingContents.has(`${message.role}:${message.content}`)) {
        return state;
      }
      
      return {
        chats: {
          ...state.chats,
          [chatflow_id]: [...existingMessages, message],
        },
      };
    }),

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
    set((state) => {
      const newChats = { ...state.chats };
      delete newChats[chatflow_id];
      return {
        chats: newChats,
        activeChatflowId: state.activeChatflowId === chatflow_id ? null : state.activeChatflowId,
      };
    }),

  // LLM entegrasyonu:
  startLLMChat: async (flow_data, input_text, workflow_id) => {
    set({ loading: true, error: null });
    const chatflow_id = crypto.randomUUID();
    get().setActiveChatflowId(chatflow_id);
    
    // Immediately add user message to UI
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chatflow_id,
      role: 'user',
      content: input_text,
      created_at: new Date().toISOString(),
    };
    get().addMessage(chatflow_id, userMessage);
    
    try {
      await executeWorkflow(flow_data, input_text, chatflow_id, undefined, workflow_id);
      // Fetch only new messages (agent responses) instead of all messages
      await get().fetchChatMessages(chatflow_id);
    } catch (e: any) {
      set({ error: e.message || 'LLM ile konuşma başlatılamadı' });
    } finally {
      set({ loading: false });
    }
  },

  sendLLMMessage: async (flow_data, input_text, chatflow_id, workflow_id) => {
    set({ loading: true, error: null });
    
    // Check if this is an edit operation by looking for existing user message
    const existingMessages = get().chats[chatflow_id] || [];
    const lastUserMessage = existingMessages
      .filter(msg => msg.role === 'user')
      .pop();
    
    // Only add new user message if this is not an edit operation
    if (!lastUserMessage || lastUserMessage.content !== input_text) {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        chatflow_id,
        role: 'user',
        content: input_text,
        created_at: new Date().toISOString(),
      };
      get().addMessage(chatflow_id, userMessage);
    }
    
    try {
      await executeWorkflow(flow_data, input_text, chatflow_id, undefined, workflow_id);
      // Fetch only new messages (agent responses) instead of all messages
      await get().fetchChatMessages(chatflow_id);
    } catch (e: any) {
      set({ error: e.message || 'Mesaj gönderilemedi' });
    } finally {
      set({ loading: false });
    }
  },

  // New function specifically for handling edited messages
  sendEditedMessage: async (flow_data: any, input_text: string, chatflow_id: string, workflow_id: string) => {
    set({ loading: true, error: null });
    
    try {
      await executeWorkflow(flow_data, input_text, chatflow_id, undefined, workflow_id);
      // Fetch only new messages (agent responses) instead of all messages
      await get().fetchChatMessages(chatflow_id);
    } catch (e: any) {
      set({ error: e.message || 'Düzenlenen mesaj gönderilemedi' });
    } finally {
      set({ loading: false });
    }
  },
})); 