import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface AuthContextType {
  currentUser: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  scopedKey: (key: string) => string;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  scopedKey: (k) => k,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("auth_current_user")
      .then((u) => setCurrentUser(u))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const stored = await AsyncStorage.getItem(`auth_user_${username}`);
      if (!stored) return false;
      const data = JSON.parse(stored);
      if (data.password !== password) return false;
      await AsyncStorage.setItem("auth_current_user", username);
      setCurrentUser(username);
      return true;
    } catch {
      return false;
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      const existing = await AsyncStorage.getItem(`auth_user_${username}`);
      if (existing) return false;
      await AsyncStorage.setItem(`auth_user_${username}`, JSON.stringify({ username, password }));
      await AsyncStorage.setItem("auth_current_user", username);
      setCurrentUser(username);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("auth_current_user");
    setCurrentUser(null);
  }, []);

  const scopedKey = useCallback((key: string) => {
    return currentUser ? `${currentUser}_${key}` : `guest_${key}`;
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, register, logout, scopedKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
