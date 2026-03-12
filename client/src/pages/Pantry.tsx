import { useState } from "react";
import { Plus, Search, X, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomSheet from "@/components/BottomSheet";

const mockIngredients = [
  { name: "Chicken breast", category: "Protein", expiry: "3 days" },
  { name: "Rice", category: "Grain", expiry: "6 months" },
  { name: "Garlic", category: "Produce", expiry: "2 weeks" },
  { name: "Soy sauce", category: "Sauce", expiry: "1 year" },
  { name: "Broccoli", category: "Produce", expiry: "5 days" },
  { name: "Eggs", category: "Protein", expiry: "2 weeks" },
  { name: "Butter", category: "Dairy", expiry: "1 month" },
  { name: "Onion", category: "Produce", expiry: "3 weeks" },
  { name: "Pasta", category: "Grain", expiry: "8 months" },
  { name: "Olive oil", category: "Oil", expiry: "6 months" },
];

const categories = ["All", "Protein", "Produce", "Grain", "Sauce", "Dairy", "Oil"];

const Pantry = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [ingredients, setIngredients] = useState(mockIngredients);

  // form state for the add modal
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Produce");
  const [newExpiry, setNewExpiry] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    // adds to local state — will hook into backend later
    setIngredients((prev) => [
      { name: newName.trim(), category: newCategory, expiry: newExpiry.trim() || "unknown" },
      ...prev,
    ]);
    toast.success(`${newName.trim()} added to your pantry!`);
    setNewName("");
    setNewCategory("Produce");
    setNewExpiry("");
    setShowAdd(false);
  };

  // filters the list live based on whatever the user typed and which category pill is active
  const filtered = ingredients.filter((ing) => {
    const matchSearch = ing.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "All" || ing.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Pantry</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/scan")}
            className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center tap-highlight-none"
            title="Scan to add"
          >
            <ScanLine size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center tap-highlight-none"
            title="Add manually"
          >
            <Plus size={16} className="text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* search bar, clears with the x button */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search ingredients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* horizontal scrolling category pills so we don't need a dropdown */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors tap-highlight-none ${activeCategory === cat
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* the actual ingredient list, each row shows name, expiry, and category badge */}
      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {filtered.map((ing) => (
          <div key={ing.name} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{ing.name}</p>
              <p className="text-xs text-muted-foreground">Expires in {ing.expiry}</p>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {ing.category}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No ingredients found</p>
          </div>
        )}
      </div>

      {/* add ingredient bottom sheet */}
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Ingredient">
        <div className="space-y-4">
          {/* item name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Item name *</label>
            <input
              type="text"
              placeholder="e.g. Chicken breast"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* category picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category *</label>
            <div className="flex flex-wrap gap-2">
              {categories.filter((c) => c !== "All").map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors tap-highlight-none ${newCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary border border-border text-muted-foreground"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* expiry is optional, just free text for now */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Expires in{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 3 days, 2 weeks, Dec 2026"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            Add to Pantry
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Pantry;
