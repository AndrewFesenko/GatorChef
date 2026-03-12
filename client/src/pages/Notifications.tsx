import { Bell, ShoppingCart, Star, ChevronRight } from "lucide-react";

const notifications = [
    {
        id: 1,
        icon: Bell,
        title: "Weekly meal plan ready",
        sub: "Your personalized plan for this week is ready to view.",
        time: "2m ago",
        unread: true,
    },
    {
        id: 2,
        icon: ShoppingCart,
        title: "Shopping list updated",
        sub: "3 items were added to your shopping list automatically.",
        time: "1h ago",
        unread: true,
    },
    {
        id: 3,
        icon: Star,
        title: "Try something new",
        sub: "Based on your pantry, you can make Lemon Herb Chicken tonight.",
        time: "Yesterday",
        unread: false,
    },
];

const Notifications = () => {
    return (
        <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent
                </p>
                <button className="text-xs text-primary font-medium tap-highlight-none">
                    Mark all read
                </button>
            </div>

            <div className="space-y-2">
                {notifications.map((n) => (
                    <button
                        key={n.id}
                        className="w-full flex items-start gap-3 px-3 py-3 rounded-xl bg-card border border-border hover:bg-surface-hover transition-colors tap-highlight-none text-left"
                    >
                        {/* Icon */}
                        <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.unread ? "bg-primary/15" : "bg-secondary"
                                }`}
                        >
                            <n.icon size={16} className={n.unread ? "text-primary" : "text-muted-foreground"} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p
                                    className={`text-sm ${n.unread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                                        }`}
                                >
                                    {n.title}
                                </p>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{n.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.sub}</p>
                        </div>

                        {n.unread && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                    </button>
                ))}
            </div>

            {notifications.length === 0 && (
                <div className="text-center py-16 space-y-2">
                    <Bell size={32} className="text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
            )}
        </div>
    );
};

export default Notifications;
