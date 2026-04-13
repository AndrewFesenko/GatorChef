import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

let cached: string[] | null = null;

export function useMealDbIngredients() {
  const [ingredients, setIngredients] = useState<string[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(cached === null);

  useEffect(() => {
    if (cached !== null) return;

    let cancelled = false;

    apiRequest<string[]>("/ingredients")
      .then((data) => {
        cached = data;
        if (!cancelled) {
          setIngredients(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to load ingredient suggestions:", err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { ingredients, isLoading };
}
