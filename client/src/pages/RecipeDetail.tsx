// single detail page for both GatorChef recipes (from data/recipes.ts) and user-created meals (passed via location.state)

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, Users, ChefHat, Lightbulb } from "lucide-react";
import { recipes } from "@/data/recipes";

interface UserMeal {
    id: string;
    title: string;
    desc: string;
    time: string;
    difficulty: "Easy" | "Medium" | "Hard";
    ingredients: string[];
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

    const gcRecipe = recipes.find((r) => r.id === id);
    const userMeal = (location.state as { meal?: UserMeal } | null)?.meal;

    // ── Not found ──────────────────────────────────────────────
    if (!gcRecipe && !userMeal) {
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
                    <p className="text-sm text-muted-foreground">Recipe not found.</p>
                </div>
            </div>
        );
    }

    // ── User-created meal ──────────────────────────────────────
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
                            {userMeal.time && userMeal.time !== "—" && (
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
                        {userMeal.ingredients.map((ing, i) => (
                            <div key={i} className="flex items-center px-4 py-3">
                                <span className="text-sm text-foreground">{ing}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl bg-card border border-border p-8 text-center space-y-2">
                    <p className="text-2xl">🧑‍🍳</p>
                    <p className="text-sm font-medium text-foreground">Steps coming soon</p>
                    <p className="text-xs text-muted-foreground">
                        You'll be able to add step-by-step instructions here.
                    </p>
                </div>
            </div>
        );
    }

    // ── GatorChef recipe ───────────────────────────────────────
    const recipe = gcRecipe!;
    const isComingSoon = recipe.steps.length === 0;

    return (
        <div className="space-y-5 pt-2 pb-4">
            {/* back button */}
            <button
                onClick={() => navigate("/meals")}
                className="flex items-center gap-2 text-sm text-muted-foreground tap-highlight-none"
            >
                <ArrowLeft size={16} />
                Back to meals
            </button>

            {/* hero area */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
                {/* placeholder image, swap this when you have real meal photos */}
                <div className="w-full h-44 bg-secondary flex items-center justify-center">
                    <span className="text-5xl">🍚</span>
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-lg font-bold text-foreground">{recipe.title}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{recipe.desc}</p>
                        </div>
                        <span className="text-sm font-bold text-primary ml-3">{recipe.match}%</span>
                    </div>

                    {/* quick stats row */}
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

            {/* coming soon state for recipes without content yet */}
            {isComingSoon ? (
                <div className="rounded-xl bg-card border border-border p-8 text-center space-y-2">
                    <p className="text-2xl">🧑‍🍳</p>
                    <p className="text-sm font-medium text-foreground">Recipe coming soon</p>
                    <p className="text-xs text-muted-foreground">
                        We're still writing up the steps for this one. Check back later.
                    </p>
                </div>
            ) : (
                <>
                    {/* ingredients list */}
                    <div>
                        <h2 className="text-sm font-semibold text-foreground mb-3">Ingredients</h2>
                        <div className="rounded-xl bg-card border border-border divide-y divide-border">
                            {recipe.ingredients.map((ing) => (
                                <div key={ing.name} className="flex items-center justify-between px-4 py-3">
                                    <span className="text-sm text-foreground">{ing.name}</span>
                                    <span className="text-xs text-muted-foreground">{ing.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* step by step instructions */}
                    <div>
                        <h2 className="text-sm font-semibold text-foreground mb-3">Instructions</h2>
                        <div className="space-y-3">
                            {recipe.steps.map((s) => (
                                <div key={s.step} className="flex gap-3">
                                    {/* step number bubble */}
                                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-[10px] font-bold text-primary-foreground">{s.step}</span>
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed">{s.instruction}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* tips section, only shows if there are any */}
                    {recipe.tips && recipe.tips.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Lightbulb size={14} className="text-primary" />
                                Tips
                            </h2>
                            <div className="rounded-xl bg-card border border-border divide-y divide-border">
                                {recipe.tips.map((tip, i) => (
                                    <div key={i} className="px-4 py-3">
                                        <p className="text-sm text-muted-foreground">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RecipeDetail;
