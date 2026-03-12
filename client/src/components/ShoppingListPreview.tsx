import { Check } from "lucide-react";

interface ShoppingListPreviewProps {
  items: { name: string; checked: boolean; category: string }[];
}

const ShoppingListPreview = ({ items }: ShoppingListPreviewProps) => {
  return (
    <div className="rounded-xl bg-card border border-border divide-y divide-border">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              item.checked
                ? "bg-primary border-primary"
                : "border-border"
            }`}
          >
            {item.checked && <Check size={12} className="text-primary-foreground" />}
          </div>
          <div className="flex-1">
            <span
              className={`text-sm ${
                item.checked
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {item.name}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {item.category}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ShoppingListPreview;
