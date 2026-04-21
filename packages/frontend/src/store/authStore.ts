import { create } from "zustand";
import { api } from "@/lib/api";

interface AuthState {
  token: string | null;
  email: string | null;
  userId: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  email: null,
  userId: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{
        token: string;
        userId: string;
        email: string;
      }>("/auth/login", { email, password });
      localStorage.setItem("droneroute_token", res.token);
      localStorage.setItem("droneroute_email", res.email);
      set({
        token: res.token,
        email: res.email,
        userId: res.userId,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{
        token: string;
        userId: string;
        email: string;
      }>("/auth/register", { email, password });
      localStorage.setItem("droneroute_token", res.token);
      localStorage.setItem("droneroute_email", res.email);
      set({
        token: res.token,
        email: res.email,
        userId: res.userId,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("droneroute_token");
    localStorage.removeItem("droneroute_email");
    set({ token: null, email: null, userId: null });
  },

  restore: () => {
    const token = localStorage.getItem("droneroute_token");
    const email = localStorage.getItem("droneroute_email");
    if (token && email) {
      set({ token, email });
    }
  },
}));
