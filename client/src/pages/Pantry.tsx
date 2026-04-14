import { useEffect, useRef, useState } from "react";
import { ListFilter, Pencil, Plus, ScanLine, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomSheet from "@/components/BottomSheet";
import AutocompleteInput from "@/components/AutocompleteInput";
import { useMealDbIngredients } from "@/hooks/useMealDbIngredients";
import { apiRequest } from "@/lib/api";

interface PantryItem {
  id: string;
  name: string;
  category: string | null;
  expiry: string;
  created_at?: number | null;
}

const categories = ["All", "Protein", "Produce", "Grain", "Sauce", "Dairy", "Oil"];
const editableCategories = categories.filter((category) => category !== "All");
type SortMode = "default" | "newest" | "oldest" | "name";

const Pantry = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [ingredients, setIngredients] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newExpiry, setNewExpiry] = useState("");

  const { ingredients: mealDbIngredients } = useMealDbIngredients();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const editingItem = ingredients.find((item) => item.id === editingItemId) ?? null;

  const formatAddedDate = (createdAt?: number | null) => {
    if (!createdAt) return "Unknown";
    const date = new Date(createdAt * 1000);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString();
  };

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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!sortMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !sortMenuRef.current.contains(target)) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    try {
      const createdItem = await apiRequest<PantryItem>("/pantry", {
        method: "POST",
        bodyJson: {
          name: newName.trim(),
          category: newCategory.trim() || null,
          expiry: newExpiry.trim() || "unknown",
        },
      });

      setIngredients((prev) => [createdItem, ...prev]);
      toast.success(`${createdItem.name} added to your pantry!`);
      setNewName("");
      setNewCategory("");
      setNewExpiry("");
      setShowAdd(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add pantry item";
      toast.error(message);
    }
  };

  const openEditSheet = (item: PantryItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditCategory(item.category ?? "");
    setEditExpiry(item.expiry === "unknown" ? "" : item.expiry);
  };

  const closeEditSheet = () => {
    setEditingItemId(null);
    setEditName("");
    setEditCategory("");
    setEditExpiry("");
    setIsSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !editName.trim()) return;

    setIsSavingEdit(true);
    try {
      const updatedItem = await apiRequest<PantryItem>(`/pantry/${editingItemId}`, {
        method: "PUT",
        bodyJson: {
          name: editName.trim(),
          category: editCategory.trim() || null,
          expiry: editExpiry.trim() || "unknown",
        },
      });

      setIngredients((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      toast.success(`${updatedItem.name} updated`);
      closeEditSheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update pantry item";
      toast.error(message);
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: PantryItem) => {
    const confirmed = window.confirm(`Remove ${item.name} from your pantry?`);
    if (!confirmed) return;

    setDeletingItemId(item.id);
    try {
      await apiRequest<void>(`/pantry/${item.id}`, {
        method: "DELETE",
      });
      setIngredients((prev) => prev.filter((ingredient) => ingredient.id !== item.id));
      toast.success(`${item.name} removed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove pantry item";
      toast.error(message);
    } finally {
      setDeletingItemId(null);
    }
  };

  const filtered = ingredients.filter((ing) => {
    const matchSearch = ing.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "All" || ing.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const sortedFiltered =
    sortMode === "default"
      ? filtered
      : [...filtered].sort((a, b) => {
        if (sortMode === "name") {
          return a.name.localeCompare(b.name);
        }

        const aTime = a.created_at ?? 0;
        const bTime = b.created_at ?? 0;
        if (aTime !== bTime) {
          return sortMode === "newest" ? bTime - aTime : aTime - bTime;
        }

        return a.name.localeCompare(b.name);
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

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
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

        <div ref={sortMenuRef} className="relative shrink-0">
          <button
            onClick={() => setIsSortMenuOpen((prev) => !prev)}
            className="h-8 px-2.5 rounded-lg bg-card border border-border flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            title="Sort options"
          >
            <ListFilter size={14} />
            Sort
          </button>

          {isSortMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-lg border border-border bg-card shadow-lg p-1 z-20">
              {[
                { value: "default", label: "Default" },
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "name", label: "Name A-Z" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortMode(option.value as SortMode);
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs ${sortMode === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary"
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {isLoading && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">Loading pantry...</p>
          </div>
        )}

        {!isLoading &&
          sortedFiltered.map((ing) => (
            <div key={ing.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{ing.name}</p>
                <p className="text-xs text-muted-foreground">Expires in {ing.expiry}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {ing.category || "No category"}
                </span>
                <button
                  onClick={() => openEditSheet(ing)}
                  className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center tap-highlight-none"
                  title={`Edit ${ing.name}`}
                >
                  <Pencil size={12} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => void handleDelete(ing)}
                  disabled={deletingItemId === ing.id}
                  className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center tap-highlight-none disabled:opacity-50"
                  title={`Remove ${ing.name}`}
                >
                  <Trash2 size={12} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}

        {!isLoading && sortedFiltered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No ingredients found</p>
          </div>
        )}
      </div>

      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Ingredient">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Item name *</label>
            <AutocompleteInput
              value={newName}
              onChange={setNewName}
              onSubmit={() => void handleAdd()}
              suggestions={mealDbIngredients}
              placeholder="e.g. Chicken breast"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category (optional)</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNewCategory("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors tap-highlight-none ${newCategory === ""
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary border border-border text-muted-foreground"
                  }`}
              >
                None
              </button>
              {editableCategories.map((cat) => (
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

      <BottomSheet isOpen={Boolean(editingItemId)} onClose={closeEditSheet} title="Edit Ingredient">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Item name *</label>
            <AutocompleteInput
              value={editName}
              onChange={setEditName}
              onSubmit={() => void handleSaveEdit()}
              suggestions={mealDbIngredients}
              placeholder="e.g. Chicken breast"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category (optional)</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditCategory("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors tap-highlight-none ${editCategory === ""
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary border border-border text-muted-foreground"
                  }`}
              >
                None
              </button>
              {editableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setEditCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors tap-highlight-none ${editCategory === cat
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
              value={editExpiry}
              onChange={(e) => setEditExpiry(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Added</label>
            <p className="text-sm text-foreground">{formatAddedDate(editingItem?.created_at)}</p>
          </div>

          <button
            onClick={() => void handleSaveEdit()}
            disabled={!editName.trim() || isSavingEdit}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Pantry;
