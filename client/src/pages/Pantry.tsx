import { useEffect, useState } from "react";
import { Plus, ScanLine, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomSheet from "@/components/BottomSheet";
import { apiRequest } from "@/lib/api";

interface PantryItem {
  id: string;
  name: string;
  category: string;
  expiry: string;
}

const categories = ["All", "Protein", "Produce", "Grain", "Sauce", "Dairy", "Oil"];

const Pantry = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [ingredients, setIngredients] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Produce");
  const [newExpiry, setNewExpiry] = useState("");

  useEffect(() => {
    const loadPantry = async () => {
      try {
        const pantryItems = await apiRequest<PantryItem[]>("/pantry");
        setIngredients(pantryItems);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load pantry";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPantry();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    try {
      const createdItem = await apiRequest<PantryItem>("/pantry", {
        method: "POST",
        bodyJson: {
          name: newName.trim(),
          category: newCategory,
          expiry: newExpiry.trim() || "unknown",
        },
      });

      setIngredients((prev) => [createdItem, ...prev]);
      toast.success(`${createdItem.name} added to your pantry!`);
      setNewName("");
      setNewCategory("Produce");
      setNewExpiry("");
      setShowAdd(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add pantry item";
      toast.error(message);
    }
  };

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

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search ingredients..."
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

      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors tap-highlight-none ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {isLoading && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">Loading pantry...</p>
          </div>
        )}

        {!isLoading &&
          filtered.map((ing) => (
            <div key={ing.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{ing.name}</p>
                <p className="text-xs text-muted-foreground">Expires in {ing.expiry}</p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {ing.category}
              </span>
            </div>
          ))}

        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No ingredients found</p>
          </div>
        )}
      </div>

      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Ingredient">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Item name *</label>
            <input
              type="text"
              placeholder="e.g. Chicken breast"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleAdd();
                }
              }}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category *</label>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c !== "All")
                .map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors tap-highlight-none ${
                      newCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary border border-border text-muted-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Expires in <span className="text-muted-foreground/60">(optional)</span>
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
            onClick={() => void handleAdd()}
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
