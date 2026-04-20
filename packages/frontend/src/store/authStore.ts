import { create } from "zustand";
import { api } from "@/lib/api";

interface AuthState {
  token: string | null;
  email: string | null;
  userId: string | null;
  isAdmin: boolean;
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
  isAdmin: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; userId: string; email: string; isAdmin: boolean }>(
        "/auth/login",
        { email, password }
      );
      localStorage.setItem("droneroute_token", res.token);
      localStorage.setItem("droneroute_email", res.email);
      localStorage.setItem("droneroute_is_admin", String(res.isAdmin));
      set({ token: res.token, email: res.email, userId: res.userId, isAdmin: res.isAdmin, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; userId: string; email: string; isAdmin: boolean }>(
        "/auth/register",
        { email, password }
      );
      localStorage.setItem("droneroute_token", res.token);
      localStorage.setItem("droneroute_email", res.email);
      localStorage.setItem("droneroute_is_admin", String(res.isAdmin));
      set({ token: res.token, email: res.email, userId: res.userId, isAdmin: res.isAdmin, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("droneroute_token");
    localStorage.removeItem("droneroute_email");
    localStorage.removeItem("droneroute_is_admin");
    set({ token: null, email: null, userId: null, isAdmin: false });
  },

  restore: () => {
    const token = localStorage.getItem("droneroute_token");
    const email = localStorage.getItem("droneroute_email");
    const isAdmin = localStorage.getItem("droneroute_is_admin") === "true";
    if (token && email) {
      set({ token, email, isAdmin });
    }
  },
}));
