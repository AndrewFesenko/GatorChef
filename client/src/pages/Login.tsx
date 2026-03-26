import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const Login = () => {
    const navigate = useNavigate();
    const { login, loginWithGoogle } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.email.trim() || !form.password) {
            toast.error("Email and password are required");
            return;
        }

        setIsSubmitting(true);
        try {
            await login(form.email.trim(), form.password);
            toast.success("Signed in successfully");
            navigate("/");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Sign in failed";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        try {
            await loginWithGoogle();
            toast.success("signed in with google");
            navigate("/");
        } catch (error) {
            const message = error instanceof Error ? error.message : "google sign in failed";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-12">
            <div className="w-full max-w-[400px] mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-1">
                    <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🐊</span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
                    <p className="text-sm text-muted-foreground">Sign in to sync your recipes & pantry</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Email */}
                    <div className="relative">
                        <Mail
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full h-12 pl-9 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Lock
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="w-full h-12 pl-9 pr-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground tap-highlight-none"
                        >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>

                    <div className="text-right">
                        <button type="button" className="text-xs text-primary font-medium tap-highlight-none">
                            Forgot password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity tap-highlight-none"
                    >
                        {isSubmitting ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or continue with</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                {/* Social placeholder */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl border border-border bg-card text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-surface-hover transition-colors tap-highlight-none disabled:opacity-60"
                >
                    <span>G</span>
                    <span>{isSubmitting ? "connecting..." : "Continue with Google"}</span>
                </button>

                {/* Sign up link */}
                <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <button
                        onClick={() => navigate("/signup")}
                        className="text-primary font-medium tap-highlight-none"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
