import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import UserAvatar from "@/components/UserAvatar";

interface TopBarProps {
  onSettingsOpen: () => void;
}

const TopBar = ({ onSettingsOpen }: TopBarProps) => {
  const { profile, user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <UserAvatar
            photoUrl={profile?.photo_url ?? user?.photoURL}
            name={profile?.display_name ?? user?.displayName}
            email={profile?.email ?? user?.email}
            sizeClassName="w-8 h-8"
            textClassName="text-sm"
          />
          <span className="text-sm font-semibold text-foreground">
            {profile?.display_name || user?.displayName || "GatorChef"}
          </span>
        </div>
        <button
          onClick={onSettingsOpen}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors tap-highlight-none"
        >
          <Settings size={18} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
