import { create } from 'zustand';

interface User {
  id: string | number;
  // Diğer alanlar eklenebilir
}

interface UserStore {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  removeUser: (id: string | number) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (user) => set((state) => ({ users: state.users.map((u) => (u.id === user.id ? user : u)) })),
  removeUser: (id) => set((state) => ({ users: state.users.filter((u) => u.id !== id) })),
})); 