import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const PublicOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthReady } = useAuth();

  // wait for session check before deciding where to route
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  if (user) {
    // keep signed-in users out of login/signup pages
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicOnlyRoute;
