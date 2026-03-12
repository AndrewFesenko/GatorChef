import { Settings } from "lucide-react";

interface TopBarProps {
  onSettingsOpen: () => void;
}

const TopBar = ({ onSettingsOpen }: TopBarProps) => {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
            G
          </div>
          <span className="text-sm font-semibold text-foreground">GatorChef</span>
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
