import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

let cached: string[] | null = null;
let inFlight: Promise<string[]> | null = null;

export function useMealDbIngredients() {
  const hasUsableCache = cached !== null && cached.length > 0;
  const [ingredients, setIngredients] = useState<string[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!hasUsableCache);

  useEffect(() => {
    if (hasUsableCache) return;

    let cancelled = false;

    const fetchPromise =
      inFlight ??
      (inFlight = apiRequest<string[]>("/ingredients").finally(() => {
        inFlight = null;
      }));

    fetchPromise
      .then((data) => {
        console.log(`[useMealDbIngredients] loaded ${data.length} ingredients`);
        cached = data;
        if (!cancelled) {
          setIngredients(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("[useMealDbIngredients] Failed to load ingredient suggestions:", err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasUsableCache]);

  return { ingredients, isLoading };
}
