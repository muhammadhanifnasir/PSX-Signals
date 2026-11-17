import { UserProfile, UserSettings, UserSettingsUpdate } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const TOKEN_KEY = "psx_auth_token";
const USER_KEY = "psx_auth_user";

export const supabaseAuth = {
  isSupabaseConfigured(): boolean {
    return Boolean(
      SUPABASE_URL &&
      !SUPABASE_URL.includes("placeholder") &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_ANON_KEY.includes("placeholder")
    );
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getStoredUser(): UserProfile | null {
    if (typeof window === "undefined") return null;
    const item = localStorage.getItem(USER_KEY);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error?: string }> {
    // 1. If Supabase configured, attempt Supabase Auth GoTrue API
    if (this.isSupabaseConfigured()) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
          const data = await res.json();
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role || "trader",
            display_name: data.user.user_metadata?.display_name || email.split("@")[0],
            created_at: data.user.created_at,
            is_active: true,
          };
          localStorage.setItem(TOKEN_KEY, data.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
          return { user: profile };
        }
      } catch (err) {
        console.warn("Supabase Auth API direct call failed, falling back to backend auth:", err);
      }
    }

    // 2. Standalone backend authentication
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { user: null, error: errData.detail || "Authentication failed" };
      }

      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { user: data.user };
    } catch (e: any) {
      return { user: null, error: e.message || "Network error" };
    }
  },

  async signOut(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      }
    } catch {
      // Return cached user if network fails
      return this.getStoredUser();
    }
    return null;
  },

  async getUserSettings(): Promise<UserSettings | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Failed to fetch user settings:", e);
    }
    return null;
  },

  async updateUserSettings(update: UserSettingsUpdate): Promise<UserSettings | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error("Failed to update user settings:", e);
    }
    return null;
  },
};
