// single source of truth for all recipe and meal data
// when the backend is ready, this gets replaced by api calls but the types stay the same

export interface RecipeIngredient {
    name: string;
    amount: string;
}

export interface RecipeStep {
    step: number;
    instruction: string;
}

export interface Recipe {
    id: string;
    title: string;
    desc: string;
    time: string;
    servings: number;
    difficulty: "Easy" | "Medium" | "Hard";
    tags: string[]; // "quick" | "budget" | "fresh"
    match: number; // 0–100, how many pantry ingredients the user already has
    ingredients: RecipeIngredient[];
    steps: RecipeStep[];
    tips?: string[];
}

export const recipes: Recipe[] = [
    {
        id: "garlic-butter-pasta",
        title: "Garlic Butter Pasta",
        desc: "Creamy and simple weeknight dinner",
        time: "20 min",
        servings: 2,
        difficulty: "Easy",
        tags: ["quick", "budget"],
        match: 92,
        // full recipe coming soon
        ingredients: [],
        steps: [],
    },
    {
        id: "chicken-stir-fry",
        title: "Chicken Stir Fry",
        desc: "Loaded with fresh vegetables",
        time: "25 min",
        servings: 2,
        difficulty: "Medium",
        tags: ["quick", "fresh"],
        match: 78,
        // full recipe coming soon
        ingredients: [],
        steps: [],
    },
    {
        id: "rice-and-beans",
        title: "Rice & Beans Bowl",
        desc: "High protein, low effort",
        time: "15 min",
        servings: 2,
        difficulty: "Easy",
        tags: ["budget"],
        match: 100,
        ingredients: [
            { name: "White rice", amount: "1 cup" },
            { name: "Black beans", amount: "1 can (15 oz)" },
            { name: "Garlic", amount: "2 cloves" },
            { name: "Olive oil", amount: "1 tbsp" },
            { name: "Cumin", amount: "1 tsp" },
            { name: "Salt & pepper", amount: "to taste" },
            { name: "Lime", amount: "1 (optional but really good)" },
            { name: "Cilantro", amount: "small handful (optional)" },
        ],
        steps: [
            {
                step: 1,
                instruction:
                    "Rinse the rice under cold water until it runs clear, then cook according to package instructions — usually a 1:2 ratio with water, simmered for about 15 minutes.",
            },
            {
                step: 2,
                instruction:
                    "While the rice is going, mince the garlic. Heat olive oil in a small pan over medium heat and add the garlic. Sauté for about 60 seconds until fragrant — don't let it brown.",
            },
            {
                step: 3,
                instruction:
                    "Drain and rinse the canned black beans, then pour them into the pan. Add the cumin, salt, and a little pepper.",
            },
            {
                step: 4,
                instruction:
                    "Stir everything together and let the beans warm through on low heat for 3–4 minutes. Taste and adjust seasoning.",
            },
            {
                step: 5,
                instruction:
                    "Scoop rice into bowls and spoon the beans on top. Squeeze fresh lime juice over everything and throw on some cilantro if you have it.",
            },
        ],
        tips: [
            "A fried egg on top adds extra protein and makes it even more filling.",
            "Leftovers keep for 3–4 days in the fridge — great for meal prep.",
            "Swap black beans for pinto or kidney beans, whatever you have.",
            "For more flavor, cook the rice in veggie broth instead of water.",
        ],
    },
    {
        id: "veggie-omelette",
        title: "Veggie Omelette",
        desc: "Quick breakfast or dinner",
        time: "10 min",
        servings: 1,
        difficulty: "Easy",
        tags: ["quick", "fresh"],
        match: 85,
        // full recipe coming soon
        ingredients: [],
        steps: [],
    },
    {
        id: "ramen-upgrade",
        title: "Ramen Upgrade",
        desc: "Level up your instant ramen",
        time: "12 min",
        servings: 1,
        difficulty: "Easy",
        tags: ["budget", "quick"],
        match: 95,
        // full recipe coming soon
        ingredients: [],
        steps: [],
    },
    {
        id: "caprese-salad",
        title: "Caprese Salad",
        desc: "Fresh and elegant",
        time: "5 min",
        servings: 2,
        difficulty: "Easy",
        tags: ["fresh"],
        match: 60,
        // full recipe coming soon
        ingredients: [],
        steps: [],
    },
];
