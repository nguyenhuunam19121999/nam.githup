import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface UserRecord {
  username: string;
  password: string;
}

interface AuthContextValue {
  currentUser: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  scopedKey: (key: string) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USERS_KEY = "auth.users";
const CURRENT_USER_KEY = "auth.currentUser";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CURRENT_USER_KEY);
        if (saved) setCurrentUser(saved);
      } catch (e) {
        console.log("Error loading auth state");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const loadUsers = useCallback(async (): Promise<UserRecord[]> => {
    try {
      const raw = await AsyncStorage.getItem(USERS_KEY);
      return raw ? (JSON.parse(raw) as UserRecord[]) : [];
    } catch {
      return [];
    }
  }, []);

  const saveUsers = useCallback(async (users: UserRecord[]) => {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      const u = username.trim();
      if (!u) return { ok: false, error: "Vui lòng nhập tên đăng nhập" };
      if (!password) return { ok: false, error: "Vui lòng nhập mật khẩu" };
      const users = await loadUsers();
      if (users.find((x) => x.username.toLowerCase() === u.toLowerCase())) {
        return { ok: false, error: "Tên đăng nhập đã tồn tại" };
      }
      users.push({ username: u, password });
      await saveUsers(users);
      await AsyncStorage.setItem(CURRENT_USER_KEY, u);
      setCurrentUser(u);
      return { ok: true };
    },
    [loadUsers, saveUsers],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const u = username.trim();
      const users = await loadUsers();
      const found = users.find(
        (x) => x.username.toLowerCase() === u.toLowerCase(),
      );
      if (!found) return { ok: false, error: "Tài khoản không tồn tại" };
      if (found.password !== password)
        return { ok: false, error: "Mật khẩu không đúng" };
      await AsyncStorage.setItem(CURRENT_USER_KEY, found.username);
      setCurrentUser(found.username);
      return { ok: true };
    },
    [loadUsers],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setCurrentUser(null);
  }, []);

  const scopedKey = useCallback(
    (key: string) => `${currentUser ?? "guest"}::${key}`,
    [currentUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, ready, login, register, logout, scopedKey }),
    [currentUser, ready, login, register, logout, scopedKey],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
