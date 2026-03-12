import { User, Mail, Camera, ChevronRight } from "lucide-react";

const profileSections = [
    { label: "Edit Profile", sub: "Name, photo, bio", icon: User },
    { label: "Email Address", sub: "andrew@email.com", icon: Mail },
];

const Profile = () => {
    return (
        <div className="pt-4 space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                        <User size={36} className="text-muted-foreground" />
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow">
                        <Camera size={13} className="text-primary-foreground" />
                    </button>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-foreground">Andrew</p>
                    <p className="text-xs text-muted-foreground">GatorChef Member</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Recipes", value: "12" },
                    { label: "Cooked", value: "47" },
                    { label: "Saved", value: "8" },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="bg-card border border-border rounded-xl p-3 text-center"
                    >
                        <p className="text-lg font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Sections */}
            <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                    Account
                </p>
                {profileSections.map((item) => (
                    <button
                        key={item.label}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-card border border-border hover:bg-surface-hover transition-colors tap-highlight-none"
                    >
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                            <item.icon size={15} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.sub}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Profile;
