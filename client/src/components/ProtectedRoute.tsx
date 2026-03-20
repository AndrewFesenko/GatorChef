import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthReady } = useAuth();

  // avoid redirect flicker until firebase resolves the current session
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    // block private routes when not logged in
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
