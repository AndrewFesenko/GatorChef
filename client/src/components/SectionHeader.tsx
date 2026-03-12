import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  onClick?: () => void;
}

// reusable section title row, pass onClick to get the chevron arrow and make it tappable
const SectionHeader = ({ title, onClick }: SectionHeaderProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full mb-3 tap-highlight-none group"
    >
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {onClick && (
        <ChevronRight
          size={14}
          className="text-muted-foreground group-hover:text-foreground transition-colors"
        />
      )}
    </button>
  );
};

export default SectionHeader;
