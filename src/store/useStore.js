import { create } from 'zustand';

export const useStore = create((set) => ({
  currentPlanId: null,
  currentTab: 'cases',
  dialog: null,
  toast: null,

  setCurrentPlan: (id) => set({ currentPlanId: id, dialog: null }),
  setTab: (tab) => set({ currentTab: tab }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
