import { create } from 'zustand';

interface Chat {
  id: string | number;
  message: string;
  sender: 'user' | 'bot';
}

interface ChatStore {
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chat: Chat) => void;
  removeChat: (id: string | number) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((state) => ({ chats: [...state.chats, chat] })),
  updateChat: (chat) => set((state) => ({ chats: state.chats.map((c) => (c.id === chat.id ? chat : c)) })),
  removeChat: (id) => set((state) => ({ chats: state.chats.filter((c) => c.id !== id) })),
})); 