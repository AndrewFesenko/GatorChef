import { Clock, DollarSign, Leaf } from "lucide-react";

interface MealPreviewCardProps {
  title: string;
  subtitle: string;
  time: string;
  tags: string[];
  matchPercent?: number;
}

const tagIcons: Record<string, typeof Clock> = {
  quick: Clock,
  budget: DollarSign,
  fresh: Leaf,
};

// card used in the horizontal scroll row on the home screen
const MealPreviewCard = ({ title, subtitle, time, tags, matchPercent }: MealPreviewCardProps) => {
  return (
    <div className="min-w-[200px] rounded-xl bg-card border border-border p-4 snap-start flex flex-col gap-3">
      {/* placeholder image area, swap this out when real meal images exist */}
      <div className="w-full h-24 rounded-lg bg-secondary flex items-center justify-center">
        <span className="text-2xl">🍽️</span>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {tags.map((tag) => {
            const Icon = tagIcons[tag];
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full"
              >
                {Icon && <Icon size={10} />}
                {tag}
              </span>
            );
          })}
        </div>
        {matchPercent && (
          <span className="text-[10px] font-semibold text-primary">{matchPercent}%</span>
        )}
      </div>
    </div>
  );
};

export default MealPreviewCard;
