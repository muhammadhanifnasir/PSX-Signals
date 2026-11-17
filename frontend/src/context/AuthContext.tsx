"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, UserSettings, UserSettingsUpdate } from "@/lib/types";
import { supabaseAuth } from "@/lib/supabase";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  settings: UserSettings | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateSettings: (update: UserSettingsUpdate) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    setIsLoading(true);
    try {
      const stored = supabaseAuth.getStoredUser();
      if (stored) {
        setUser(stored);
      }
      const current = await supabaseAuth.getCurrentUser();
      if (current) {
        setUser(current);
        const userSettings = await supabaseAuth.getUserSettings();
        if (userSettings) setSettings(userSettings);
      }
    } catch (e) {
      console.warn("Auth initialization note:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await supabaseAuth.signIn(email, password);
    if (res.user) {
      setUser(res.user);
      const userSettings = await supabaseAuth.getUserSettings();
      if (userSettings) setSettings(userSettings);
      return { success: true };
    }
    return { success: false, error: res.error || "Login failed" };
  };

  const signOut = async () => {
    await supabaseAuth.signOut();
    setUser(null);
    setSettings(null);
  };

  const updateSettings = async (update: UserSettingsUpdate) => {
    const updated = await supabaseAuth.updateUserSettings(update);
    if (updated) {
      setSettings(updated);
      return true;
    }
    return false;
  };

  const refreshUser = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        settings,
        signIn,
        signOut,
        updateSettings,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
