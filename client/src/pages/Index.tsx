import { useNavigate } from "react-router-dom";
import { Plus, Receipt, QrCode, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import SectionHeader from "@/components/SectionHeader";
import QuickActionButton from "@/components/QuickActionButton";
import MealPreviewCard from "@/components/MealPreviewCard";
import ShoppingListPreview from "@/components/ShoppingListPreview";

const mockMeals = [
  { title: "Garlic Pasta", subtitle: "20 min • 4 ingredients", time: "20 min", tags: ["quick", "budget"], matchPercent: 92 },
  { title: "Chicken Stir Fry", subtitle: "25 min • 6 ingredients", time: "25 min", tags: ["quick", "fresh"], matchPercent: 78 },
  { title: "Rice & Beans", subtitle: "15 min • 3 ingredients", time: "15 min", tags: ["budget"], matchPercent: 100 },
];

const mockShoppingItems = [
  { name: "Chicken breast", checked: false, category: "Protein" },
  { name: "Soy sauce", checked: true, category: "Sauce" },
  { name: "Broccoli", checked: false, category: "Produce" },
  { name: "Jasmine rice", checked: true, category: "Grain" },
];

// stagger animation so each section fades in one after another instead of everything at once
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-2">
      {/* greeting at the top, nothing fancy */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Good evening 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">What are we cooking tonight?</p>
      </motion.div>

      {/* hero card showing pantry match summary */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-card border border-primary/20 p-5">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-primary/20 rounded-full px-2.5 py-1 mb-3">
              <Sparkles size={12} className="text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Pantry Match</span>
            </div>
            <h2 className="text-lg font-bold text-foreground">You can make 7 meals</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Based on the 12 ingredients in your pantry right now.
            </p>
            <button
              onClick={() => navigate("/meals")}
              className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              See Meals
            </button>
          </div>
        </div>
      </motion.div>

      {/* three main actions the user does most often */}
      <motion.div variants={item}>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-3 gap-3">
          <QuickActionButton icon={Plus} label="Add Pantry" onClick={() => navigate("/pantry")} />
          <QuickActionButton icon={Receipt} label="Scan Receipt" onClick={() => navigate("/scan")} />
          <QuickActionButton icon={QrCode} label="Scan QR" onClick={() => navigate("/scan")} />
        </div>
      </motion.div>

      {/* horizontal scroll so you can peek at more meals without leaving the home screen */}
      <motion.div variants={item}>
        <SectionHeader title="Suggested Meals" onClick={() => navigate("/meals")} />
        <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory -mx-4 px-4">
          {mockMeals.map((meal) => (
            <MealPreviewCard key={meal.title} {...meal} />
          ))}
        </div>
      </motion.div>

      {/* just a quick glance at the list, tap the header to go to the full thing */}
      <motion.div variants={item}>
        <SectionHeader title="Shopping List" onClick={() => navigate("/list")} />
        <ShoppingListPreview items={mockShoppingItems} />
      </motion.div>
    </motion.div>
  );
};

export default Index;
