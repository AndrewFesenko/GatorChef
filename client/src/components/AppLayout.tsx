import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import SettingsDrawer from "./SettingsDrawer";
import { useTheme } from "@/lib/useTheme";

const AppLayout = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background max-w-[480px] mx-auto relative">
      <TopBar onSettingsOpen={() => setSettingsOpen(true)} />
      <main className="pb-20 px-4">
        <Outlet />
      </main>
      <BottomNav />
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        onToggleTheme={toggle}
      />
    </div>
  );
};

export default AppLayout;
