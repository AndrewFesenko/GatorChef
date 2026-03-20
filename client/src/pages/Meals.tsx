import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, DollarSign, Leaf, Search, ChevronRight, Plus, X, ChefHat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { recipes } from "@/data/recipes";
import BottomSheet from "@/components/BottomSheet";

const tagConfig: Record<string, { icon: typeof Clock; label: string }> = {
  quick: { icon: Clock, label: "Quick" },
  budget: { icon: DollarSign, label: "Budget" },
  fresh: { icon: Leaf, label: "Fresh" },
};

const filters = ["All", "Quick", "Budget", "Fresh", "High Match"];

interface UserMeal {
  id: string;
  title: string;
  desc: string;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  ingredients: string[];
}

const Meals = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [tab, setTab] = useState<"gatorchef" | "mine">("gatorchef");
  const [showCreate, setShowCreate] = useState(false);
  const [userMeals, setUserMeals] = useState<UserMeal[]>([]);
  const navigate = useNavigate();

  // new meal form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [newIngredients, setNewIngredients] = useState<string[]>([""]);

  const resetForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewTime("");
    setNewDifficulty("Easy");
    setNewIngredients([""]);
  };

  const filledIngredients = newIngredients.filter((s) => s.trim());
  const canSave = newTitle.trim() && filledIngredients.length > 0;

  const handleCreateMeal = () => {
    if (!canSave) return;
    const meal: UserMeal = {
      id: `user-${Date.now()}`,
      title: newTitle.trim(),
      desc: newDesc.trim() || "No description",
      time: newTime.trim() || "—",
      difficulty: newDifficulty,
      ingredients: filledIngredients,
    };
    setUserMeals((prev) => [meal, ...prev]);
    toast.success(`"${meal.title}" added to My Meals!`);
    resetForm();
    setShowCreate(false);
  };

  const addIngredientRow = () => {
    setNewIngredients((prev) => [...prev, ""]);
  };

  const updateIngredient = (i: number, value: string) => {
    setNewIngredients((prev) => prev.map((ing, idx) => (idx === i ? value : ing)));
  };

  const removeIngredient = (i: number) => {
    setNewIngredients((prev) => prev.filter((_, idx) => idx !== i));
  };

  // GatorChef tab filtering
  const filteredGC = recipes.filter((meal) => {
    const matchSearch = meal.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "High Match" && meal.match >= 90) ||
      meal.tags.includes(activeFilter.toLowerCase());
    return matchSearch && matchFilter;
  });

  // My Meals tab filtering
  const filteredMine = userMeals.filter((meal) =>
    meal.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Meals</h1>
        {tab === "mine" && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center tap-highlight-none"
          >
            <Plus size={16} className="text-primary-foreground" />
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex bg-card border border-border rounded-lg p-1 gap-1">
        <button
          onClick={() => setTab("gatorchef")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${tab === "gatorchef" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
        >
          <Sparkles size={12} />
          GatorChef
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${tab === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
        >
          <ChefHat size={12} />
          My Meals
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={tab === "gatorchef" ? "Search GatorChef meals…" : "Search my meals…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Filter pills — only relevant for GatorChef tab */}
      {tab === "gatorchef" && (
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
      )}

      {/* built-in gatorchef meals */}
      {tab === "gatorchef" && (
        <div className="space-y-3">
          {filteredGC.map((meal) => (
            <div key={meal.id} className="rounded-xl bg-card border border-border p-4 space-y-3">
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
                <span className="text-xs text-muted-foreground">{meal.time} • {meal.ingredients.length} items</span>
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
          {filteredGC.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No meals found</p>
            </div>
          )}
        </div>
      )}

      {/* user-created meals */}
      {tab === "mine" && (
        <div className="space-y-3">
          {filteredMine.map((meal) => (
            <div key={meal.id} className="rounded-xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{meal.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{meal.desc}</p>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-3">
                  {meal.difficulty}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {meal.ingredients.length > 0 ? `${meal.ingredients.length} ingredient${meal.ingredients.length !== 1 ? "s" : ""}` : "No ingredients added"}
                </span>
                <span className="text-xs text-muted-foreground">{meal.time}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/meals/${meal.id}`, { state: { meal } })}
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

          {filteredMine.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
                <ChefHat size={22} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No meals yet</p>
                <p className="text-xs text-muted-foreground mt-1">Tap the + to create your first meal</p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold tap-highlight-none"
              >
                <Plus size={14} />
                Create Meal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Meal Sheet */}
      <BottomSheet isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create Meal">
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Meal name *</label>
            <input
              type="text"
              placeholder="e.g. Mom's Chicken Soup"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
            <input
              type="text"
              placeholder="Short description of the meal"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Cook time + Difficulty row */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cook time</label>
              <input
                type="text"
                placeholder="e.g. 30 min"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
              <div className="flex gap-1">
                {(["Easy", "Medium", "Hard"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setNewDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors tap-highlight-none ${newDifficulty === d ? "bg-primary text-primary-foreground" : "bg-secondary border border-border text-muted-foreground"
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients — required, one input row per ingredient */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ingredients *</label>
            <div className="space-y-2">
              {newIngredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Ingredient ${i + 1}`}
                    value={ing}
                    onChange={(e) => updateIngredient(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addIngredientRow(); }
                    }}
                    className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {newIngredients.length > 1 && (
                    <button
                      onClick={() => removeIngredient(i)}
                      className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center tap-highlight-none flex-shrink-0"
                    >
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addIngredientRow}
              className="flex items-center gap-1.5 text-xs text-primary font-medium mt-1 tap-highlight-none"
            >
              <Plus size={13} />
              Add ingredient
            </button>
          </div>

          <button
            onClick={handleCreateMeal}
            disabled={!canSave}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity tap-highlight-none"
          >
            Save Meal
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Meals;
