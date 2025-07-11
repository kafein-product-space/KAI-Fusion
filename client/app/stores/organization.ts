import { create } from 'zustand';

interface Organization {
  id: string | number;
  // Diğer alanlar eklenebilir
}

interface OrganizationStore {
  organizations: Organization[];
  setOrganizations: (organizations: Organization[]) => void;
  addOrganization: (organization: Organization) => void;
  updateOrganization: (organization: Organization) => void;
  removeOrganization: (id: string | number) => void;
}

export const useOrganizationStore = create<OrganizationStore>((set) => ({
  organizations: [],
  setOrganizations: (organizations) => set({ organizations }),
  addOrganization: (organization) => set((state) => ({ organizations: [...state.organizations, organization] })),
  updateOrganization: (organization) => set((state) => ({ organizations: state.organizations.map((o) => (o.id === organization.id ? organization : o)) })),
  removeOrganization: (id) => set((state) => ({ organizations: state.organizations.filter((o) => o.id !== id) })),
})); 