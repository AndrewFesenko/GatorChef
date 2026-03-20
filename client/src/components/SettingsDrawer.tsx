import { motion, AnimatePresence } from "framer-motion";
import { X, Moon, LogIn, LogOut, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import UserAvatar from "@/components/UserAvatar";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const SettingsDrawer = ({ isOpen, onClose, isDark, onToggleTheme }: SettingsDrawerProps) => {
  const navigate = useNavigate();
  const { logout, user, profile } = useAuth();

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out");
      onClose();
      navigate("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign out";
      toast.error(message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* dim overlay behind the drawer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* drawer panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-[360px] bg-card border-l border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-border">
              <span className="text-sm font-semibold">Settings</span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-1">
              {/* Profile */}
              <button
                onClick={() => handleNav("/profile")}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-hover transition-colors tap-highlight-none"
              >
                <UserAvatar
                  photoUrl={profile?.photo_url ?? user?.photoURL}
                  name={profile?.display_name ?? user?.displayName}
                  email={profile?.email ?? user?.email}
                  sizeClassName="w-8 h-8"
                  textClassName="text-xs"
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Profile</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email ?? user?.email ?? "Manage your account"}
                  </p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>

              {!user && (
                <button
                  onClick={() => handleNav("/login")}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-hover transition-colors tap-highlight-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <LogIn size={15} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Log In</p>
                    <p className="text-xs text-muted-foreground">Sign in to sync data</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              )}

              {/* Dark Mode toggle */}
              <button
                onClick={onToggleTheme}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-hover transition-colors tap-highlight-none"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Moon size={15} className="text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {isDark ? "Currently dark" : "Currently light"}
                  </p>
                </div>
                {/* animated pill toggle */}
                <div
                  className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-200 ${isDark ? "bg-primary justify-end" : "bg-secondary justify-start"
                    }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Log Out */}
              <button
                onClick={() => void handleLogout()}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-hover transition-colors tap-highlight-none"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <LogOut size={15} className="text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Log Out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your account</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer;
