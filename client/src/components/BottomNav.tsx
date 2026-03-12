import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { label: "Home", path: "/" },
  { label: "Pantry", path: "/pantry" },
  { label: "Scan", path: "/scan" },
  { label: "Meals", path: "/meals" },
  { label: "List", path: "/list" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    // fixed to the bottom, blurred background so content scrolls under it naturally
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="max-w-[480px] mx-auto flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center flex-1 h-full tap-highlight-none"
            >
              {/* sliding underline indicator, framer motion handles the animation between tabs */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 inset-x-0 mx-auto w-8 h-[2px] bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span
                className={`text-xs font-medium transition-colors duration-150 ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
