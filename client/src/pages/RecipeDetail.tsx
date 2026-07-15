import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, Users, ChefHat, Lightbulb } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface UserMeal {
  id: string;
  title: string;
  desc: string;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  ingredients: string[];
}

interface RecipeIngredient {
  name: string;
  amount: string;
}

interface RecipeStep {
  step: number;
  instruction: string;
}

interface RecipeDetailPayload {
  id: string;
  title: string;
  desc: string;
  time: string;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  ingredients: string[];
  ingredient_details: RecipeIngredient[];
  steps: RecipeStep[];
  tips: string[];
  image_url?: string | null;
}

const USER_MEALS_STORAGE_KEY = "gatorchef-user-meals";

function loadStoredUserMeal(id?: string): UserMeal | null {
  if (!id || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(USER_MEALS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const meal = parsed.find((entry: unknown) => (
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      (entry as UserMeal).id === id
    ));

    if (!meal) return null;
    if (
      typeof meal.id !== "string" ||
      typeof meal.title !== "string" ||
      typeof meal.desc !== "string" ||
      typeof meal.time !== "string" ||
      !["Easy", "Medium", "Hard"].includes(meal.difficulty) ||
      !Array.isArray(meal.ingredients)
    ) {
      return null;
    }

    return {
      id: meal.id,
      title: meal.title,
      desc: meal.desc,
      time: meal.time,
      difficulty: meal.difficulty,
      ingredients: meal.ingredients.filter((ingredient): ingredient is string => typeof ingredient === "string"),
    };
  } catch {
    return null;
  }
}

const difficultyColor: Record<string, string> = {
  Easy: "text-primary bg-primary/10",
  Medium: "text-yellow-400 bg-yellow-400/10",
  Hard: "text-destructive bg-destructive/10",
};

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeMeal = (location.state as { meal?: UserMeal } | null)?.meal;
  const userMeal = routeMeal ?? loadStoredUserMeal(id);

  const [recipe, setRecipe] = useState<RecipeDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(!userMeal);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!id || userMeal) return;

    const loadRecipe = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const payload = await apiRequest<RecipeDetailPayload>(`/recipes/${id}`);
        setRecipe(payload);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Recipe not found.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecipe();
  }, [id, userMeal]);

  if (userMeal) {
    return (
      <div className="space-y-5 pt-2 pb-4">
        <button
          onClick={() => navigate("/meals")}
          className="flex items-center gap-2 text-sm text-muted-foreground tap-highlight-none"
        >
          <ArrowLeft size={16} />
          Back to meals
        </button>

        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="w-full h-44 bg-secondary flex items-center justify-center">
            <span className="text-5xl">🍽️</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h1 className="text-lg font-bold text-foreground">{userMeal.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{userMeal.desc}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${difficultyColor[userMeal.difficulty]}`}>
                {userMeal.difficulty}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {userMeal.time && userMeal.time !== "-" && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={13} />
                  {userMeal.time}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ChefHat size={13} />
                My Meal
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Ingredients</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {userMeal.ingredients.map((ing, index) => (
              <div key={index} className="flex items-center px-4 py-3">
                <span className="text-sm text-foreground">{ing}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-8 text-center space-y-2">
          <p className="text-2xl">🧑‍🍳</p>
          <p className="text-sm font-medium text-foreground">Steps coming soon</p>
          <p className="text-xs text-muted-foreground">
            You&apos;ll be able to add step-by-step instructions here.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pt-2 space-y-4">
        <button
          onClick={() => navigate("/meals")}
          className="flex items-center gap-2 text-sm text-muted-foreground tap-highlight-none"
        >
          <ArrowLeft size={16} />
          Back to meals
        </button>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="pt-2 space-y-4">
        <button
          onClick={() => navigate("/meals")}
          className="flex items-center gap-2 text-sm text-muted-foreground tap-highlight-none"
        >
          <ArrowLeft size={16} />
          Back to meals
        </button>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">{loadError || "Recipe not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2 pb-4">
      <button
        onClick={() => navigate("/meals")}
        className="flex items-center gap-2 text-sm text-muted-foreground tap-highlight-none"
      >
        <ArrowLeft size={16} />
        Back to meals
      </button>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="w-full h-44 bg-secondary overflow-hidden flex items-center justify-center">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">🍲</span>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{recipe.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{recipe.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={13} />
              {recipe.time}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users size={13} />
              {recipe.servings} servings
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ChefHat size={13} />
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${difficultyColor[recipe.difficulty]}`}>
                {recipe.difficulty}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Ingredients</h2>
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          {recipe.ingredient_details.map((ingredient) => (
            <div key={`${ingredient.name}-${ingredient.amount}`} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{ingredient.name}</span>
              <span className="text-xs text-muted-foreground">{ingredient.amount || "to taste"}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Instructions</h2>
        <div className="space-y-3">
          {recipe.steps.map((step) => (
            <div key={step.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary-foreground">{step.step}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{step.instruction}</p>
            </div>
          ))}
        </div>
      </div>

      {recipe.tips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-primary" />
            Tips
          </h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {recipe.tips.map((tip, index) => (
              <div key={index} className="px-4 py-3">
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetail;
