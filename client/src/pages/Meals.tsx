import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, DollarSign, Leaf, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { recipes } from "@/data/recipes";

const tagConfig: Record<string, { icon: typeof Clock; label: string }> = {
  quick: { icon: Clock, label: "Quick" },
  budget: { icon: DollarSign, label: "Budget" },
  fresh: { icon: Leaf, label: "Fresh" },
};

const filters = ["All", "Quick", "Budget", "Fresh", "High Match"];

const Meals = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const navigate = useNavigate();

  // filters by search text and the selected pill at the same time
  const filtered = recipes.filter((meal) => {
    const matchSearch = meal.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "High Match" && meal.match >= 90) ||
      meal.tags.includes(activeFilter.toLowerCase());
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-xl font-bold text-foreground">Meals</h1>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search meals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors tap-highlight-none ${activeFilter === f
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((meal) => (
          <div key={meal.id} className="rounded-xl bg-card border border-border p-4 space-y-3">
            {/* tapping the title row opens the recipe detail page */}
            <button
              onClick={() => navigate(`/meals/${meal.id}`)}
              className="w-full text-left tap-highlight-none"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{meal.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{meal.desc}</p>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <span className="text-xs font-bold text-primary">{meal.match}%</span>
                  <ChevronRight size={13} className="text-muted-foreground" />
                </div>
              </div>
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {meal.tags.map((tag) => {
                  const config = tagConfig[tag];
                  if (!config) return null;
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full"
                    >
                      <config.icon size={10} />
                      {config.label}
                    </span>
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground">{meal.time} • {meal.ingredients.length || "—"} items</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/meals/${meal.id}`)}
                className="flex-1 bg-secondary text-foreground py-2 rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                View Recipe
              </button>
              <button
                onClick={() => toast.success(`${meal.title} added to your list!`)}
                className="flex-1 bg-primary/10 text-primary py-2 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                Add to List
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No meals found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Meals;
