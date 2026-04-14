import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/api";

export type UserProfile = {
  uid: string;
  email: string;
  display_name: string;
  photo_url?: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  isAuthReady: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (payload: { displayName: string; photoUrl?: string | null }) => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_STORAGE_KEY = "gatorchef_id_token";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const fetchProfile = async (idToken: string): Promise<UserProfile | null> => {
    try {
      return await apiRequest<UserProfile>("/users/me", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        // keep a fresh id token for backend requests
        const token = await nextUser.getIdToken();
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        const nextProfile = await fetchProfile(token);
        setProfile(nextProfile);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setProfile(null);
      }

      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        return;
      }

      const token = await nextUser.getIdToken();
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    });

    return unsubscribe;
  }, []);

  const upsertProfile = async (idToken: string, email: string, displayName: string, photoUrl?: string | null) => {
    const bodyJson: {
      email: string;
      display_name: string;
      photo_url?: string | null;
    } = {
      email,
      display_name: displayName,
    };

    // Only send photo when explicitly provided so we do not accidentally wipe it.
    if (photoUrl !== undefined) {
      bodyJson.photo_url = photoUrl;
    }

    // make sure a firestore profile exists for this auth user
    const updated = await apiRequest<UserProfile>("/users/me", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      bodyJson,
    });

    setProfile(updated);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAuthReady,
      signup: async (name: string, email: string, password: string) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (credential.user) {
          // keep firebase auth display name and firestore profile in sync
          await updateProfile(credential.user, { displayName: name });
          const idToken = await credential.user.getIdToken();
          localStorage.setItem(TOKEN_STORAGE_KEY, idToken);
          await upsertProfile(idToken, email, name, credential.user.photoURL ?? undefined);
        }
      },
      login: async (email: string, password: string) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        localStorage.setItem(TOKEN_STORAGE_KEY, idToken);

        const existingProfile = await fetchProfile(idToken);
        // Prefer backend profile fields so a relogin does not clobber user customizations.
        const profileDisplayName =
          existingProfile?.display_name ?? credential.user.displayName ?? "GatorChef User";
        const profilePhotoUrl =
          existingProfile?.photo_url ?? credential.user.photoURL ?? undefined;

        // Ensure a profile exists even for users created outside this client.
        await upsertProfile(
          idToken,
          existingProfile?.email ?? credential.user.email ?? email,
          profileDisplayName,
          profilePhotoUrl,
        );
      },
      loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        const credential = await signInWithPopup(auth, provider);
        const idToken = await credential.user.getIdToken();
        localStorage.setItem(TOKEN_STORAGE_KEY, idToken);

        const existingProfile = await fetchProfile(idToken);
        const profileDisplayName =
          existingProfile?.display_name ?? credential.user.displayName ?? "GatorChef User";
        const profilePhotoUrl =
          existingProfile?.photo_url ?? credential.user.photoURL ?? undefined;

        await upsertProfile(
          idToken,
          existingProfile?.email ?? credential.user.email ?? "",
          profileDisplayName,
          profilePhotoUrl,
        );
      },
      logout: async () => {
        await signOut(auth);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setProfile(null);
      },
      sendPasswordReset: async (email: string) => {
        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
          throw new Error("Email is required to reset your password.");
        }

        await sendPasswordResetEmail(auth, normalizedEmail);
      },
      updateUserProfile: async ({ displayName, photoUrl }) => {
        const authUser = auth.currentUser;
        if (!authUser) {
          throw new Error("You must be signed in to update your profile.");
        }

        const email = authUser.email ?? profile?.email;
        if (!email) {
          throw new Error("Unable to update profile because no email is available.");
        }

        // Firebase Auth rejects long data URLs for photoURL, so keep large
        // avatar images in our backend profile and only push normal URLs to Auth.
        const isDataUrlPhoto = typeof photoUrl === "string" && photoUrl.startsWith("data:");
        await updateProfile(authUser, {
          displayName,
          photoURL: isDataUrlPhoto ? authUser.photoURL : (photoUrl ?? null),
        });

        const idToken = await authUser.getIdToken(true);
        localStorage.setItem(TOKEN_STORAGE_KEY, idToken);

        await upsertProfile(
          idToken,
          email,
          displayName,
          photoUrl,
        );
      },
      changePassword: async (currentPassword: string, nextPassword: string) => {
        const authUser = auth.currentUser;
        if (!authUser || !authUser.email) {
          throw new Error("You must be signed in with an email account to change password.");
        }

        const credential = EmailAuthProvider.credential(authUser.email, currentPassword);
        await reauthenticateWithCredential(authUser, credential);
        await updatePassword(authUser, nextPassword);
      },
    }),
    [isAuthReady, profile, user],
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
