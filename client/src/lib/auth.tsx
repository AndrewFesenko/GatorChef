import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  isAuthReady: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_STORAGE_KEY = "gatorchef_id_token";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        const token = await nextUser.getIdToken();
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }

      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const upsertProfile = async (idToken: string, email: string, displayName: string) => {
    await apiRequest("/users/me", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      bodyJson: {
        email,
        display_name: displayName,
      },
    });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthReady,
      signup: async (name: string, email: string, password: string) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (credential.user) {
          await updateProfile(credential.user, { displayName: name });
          const idToken = await credential.user.getIdToken();
          localStorage.setItem(TOKEN_STORAGE_KEY, idToken);
          await upsertProfile(idToken, email, name);
        }
      },
      login: async (email: string, password: string) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        localStorage.setItem(TOKEN_STORAGE_KEY, idToken);

        // Ensure a profile exists even for users created outside this client.
        await upsertProfile(idToken, credential.user.email ?? email, credential.user.displayName ?? "GatorChef User");
      },
      logout: async () => {
        await signOut(auth);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      },
    }),
    [isAuthReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
