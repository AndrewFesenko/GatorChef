import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";

interface ListItem {
  id: number;
  name: string;
  category: string;
  checked: boolean;
}

const initialItems: ListItem[] = [
  { id: 1, name: "Chicken breast", category: "Protein", checked: false },
  { id: 2, name: "Soy sauce", category: "Sauce", checked: true },
  { id: 3, name: "Broccoli", category: "Produce", checked: false },
  { id: 4, name: "Jasmine rice", category: "Grain", checked: true },
  { id: 5, name: "Garlic cloves", category: "Produce", checked: false },
  { id: 6, name: "Sesame oil", category: "Oil", checked: false },
  { id: 7, name: "Green onions", category: "Produce", checked: false },
  { id: 8, name: "Eggs", category: "Protein", checked: true },
];

const listCategories = ["Produce", "Protein", "Grain", "Dairy", "Sauce", "Oil", "Other"];

const ShoppingList = () => {
  const [items, setItems] = useState(initialItems);
  const [showAdd, setShowAdd] = useState(false);

  // form state for the add modal
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Produce");

  const toggle = (id: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));

  // clears only the checked items, keeps the rest
  const clearCompleted = () => {
    setItems((prev) => prev.filter((i) => !i.checked));
    toast.success("Cleared completed items");
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const nextId = Math.max(...items.map((i) => i.id), 0) + 1;
    setItems((prev) => [
      ...prev,
      { id: nextId, name: newName.trim(), category: newCategory, checked: false },
    ]);
    toast.success(`${newName.trim()} added to your list!`);
    setNewName("");
    setNewCategory("Produce");
    setShowAdd(false);
  };

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  // groups unchecked items by category so it's easier to shop section by section
  const grouped = unchecked.reduce<Record<string, ListItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Shopping List</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{unchecked.length} remaining • {checked.length} done</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center tap-highlight-none"
        >
          <Plus size={16} className="text-primary-foreground" />
        </button>
      </div>

      {/* items still left to grab, organized by store section */}
      {Object.entries(grouped).map(([category, categoryItems]) => (
        <div key={category}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {categoryItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggle(item.id)}
                  className="w-5 h-5 rounded-md border border-border flex items-center justify-center tap-highlight-none hover:border-primary transition-colors"
                />
                <span className="flex-1 text-sm text-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* stuff already in the cart, shown at the bottom so it's out of the way */}
      {checked.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</p>
            <button
              onClick={clearCompleted}
              className="text-xs text-destructive font-medium flex items-center gap-1 tap-highlight-none"
            >
              <Trash2 size={10} />
              Clear
            </button>
          </div>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {checked.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggle(item.id)}
                  className="w-5 h-5 rounded-md bg-primary border border-primary flex items-center justify-center tap-highlight-none"
                >
                  <Check size={12} className="text-primary-foreground" />
                </button>
                <span className="flex-1 text-sm text-muted-foreground line-through">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* add item bottom sheet */}
      <BottomSheet isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Item">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Item name *</label>
            <input
              type="text"
              placeholder="e.g. Oat milk"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category *</label>
            <div className="flex flex-wrap gap-2">
              {listCategories.map((cat) => (
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

          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            Add to List
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default ShoppingList;
