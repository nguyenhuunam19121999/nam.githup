import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

interface UserRecord {
  username: string;
  password: string;
}

interface AuthContextValue {
  currentUser: string | null;
  firebaseUid: string | null;
  referralCode: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;   // 👈 thêm dòng này
  scopedKey: (key: string) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USERS_KEY = "auth.users";
const CURRENT_USER_KEY = "auth.currentUser";
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateReferralCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function ensureUserDocument(uid: string): Promise<string> {
  const ref = firestore().collection("users").doc(uid);
  const doc = await ref.get();

  if (doc.exists()) {
    return doc.data()?.referralCode ?? "";
  }

  const code = generateReferralCode();
  await ref.set({
    referralCode: code,
    referralPoints: 0,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return code;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        setFirebaseUid(user.uid);
        ensureUserDocument(user.uid)
          .then((code) => setReferralCode(code))
          .catch((err) => console.error("Lỗi khởi tạo mã giới thiệu:", err));
      } else {
        auth()
          .signInAnonymously()
          .then((cred) => {
            setFirebaseUid(cred.user.uid);
            return ensureUserDocument(cred.user.uid);
          })
          .then((code) => setReferralCode(code))
          .catch((err) => console.error("Lỗi đăng nhập ẩn danh Firebase:", err));
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // await AsyncStorage.clear(); // 👈 THÊM DÒNG NÀY xóa dữ liệu người dùng 
        const saved = await AsyncStorage.getItem(CURRENT_USER_KEY);
        if (saved) setCurrentUser(saved);
      } catch (e) {
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
      if (password.length > 8) {
        return { ok: false, error: "Mật khẩu tối đa 8 ký tự" };
      }
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

  const deleteAccount = useCallback(async () => {
    if (!currentUser) return { ok: false, error: "Chưa đăng nhập" };

    try {
      const pointsKey = scopedKey("points");
      const uidToDelete = firebaseUid;
      const users = await loadUsers();
      const filtered = users.filter(
        (x) => x.username.toLowerCase() !== currentUser.toLowerCase(),
      );
      await saveUsers(filtered);
      if (uidToDelete) {
        await firestore().collection("users").doc(uidToDelete).delete();
      }

      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      await AsyncStorage.removeItem(pointsKey);
      setCurrentUser(null);
      setReferralCode(null);
      await auth().signOut();
      setFirebaseUid(null);

      return { ok: true };
    } catch (err) {
      return { ok: false, error: "Không thể xoá tài khoản, vui lòng thử lại." };
    }
  }, [currentUser, firebaseUid, loadUsers, saveUsers, scopedKey]);

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, firebaseUid, referralCode, ready, login, register, logout, deleteAccount, scopedKey }),
    [currentUser, firebaseUid, referralCode, ready, login, register, logout, deleteAccount, scopedKey],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}