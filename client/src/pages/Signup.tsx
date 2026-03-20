import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const Signup = () => {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim() || !form.email.trim() || !form.password) {
            toast.error("Name, email, and password are required");
            return;
        }

        if (form.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        if (form.password !== form.confirm) {
            toast.error("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            await signup(form.name.trim(), form.email.trim(), form.password);
            toast.success("Account created successfully");
            navigate("/");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Sign up failed";
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
                    <h1 className="text-xl font-bold text-foreground">Create an account</h1>
                    <p className="text-sm text-muted-foreground">Join GatorChef to sync your recipes & pantry</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Name */}
                    <div className="relative">
                        <User
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Full name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full h-12 pl-9 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

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

                    {/* Confirm Password */}
                    <div className="relative">
                        <Lock
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Confirm password"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                            className="w-full h-12 pl-9 pr-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground tap-highlight-none"
                        >
                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity tap-highlight-none"
                    >
                        {isSubmitting ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or continue with</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                {/* Social placeholder */}
                <button type="button" className="w-full h-12 rounded-xl border border-border bg-card text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-surface-hover transition-colors tap-highlight-none">
                    <span>G</span>
                    <span>Continue with Google</span>
                </button>

                {/* Log in link */}
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                        onClick={() => navigate("/login")}
                        className="text-primary font-medium tap-highlight-none"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Signup;
