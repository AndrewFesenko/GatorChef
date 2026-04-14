# Ingredient Autocomplete Feature — Developer Reference

**Project:** GatorChef  
**Feature:** Pantry Ingredient Autocomplete  
**Date Documented:** 2026-04-12  
**Status:** Implemented

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Architecture Diagram](#architecture-diagram)
4. [File-by-File Breakdown](#file-by-file-breakdown)
   - [server/app/services/ingredient_loader.py](#serverapservicesingredient_loaderpy)
   - [server/app/routes/ingredients.py](#serverapproutesingredientspy)
   - [server/app/main.py](#serverappmainpy)
   - [client/src/hooks/useMealDbIngredients.ts](#clientsrcusemealdbingredientsts)
   - [client/src/components/AutocompleteInput.tsx](#clientsrccomponentsautocompleteinputtsx)
   - [client/src/pages/Pantry.tsx](#clientsrcpagespantrytsx)
5. [Data Flow](#data-flow)
6. [Filtering Algorithm](#filtering-algorithm)
7. [Keyboard Navigation Spec](#keyboard-navigation-spec)
8. [Fallback Behavior](#fallback-behavior)
9. [TheMealDB API Reference](#themealdb-api-reference)
10. [Caching Strategy](#caching-strategy)
11. [Styling Conventions](#styling-conventions)
12. [Tech Stack Dependencies](#tech-stack-dependencies)
13. [Why Canonical Names Matter](#why-canonical-names-matter)
14. [Developer Onboarding Notes](#developer-onboarding-notes)

---

## Overview

The ingredient autocomplete feature replaces the free-text `<input>` elements in the Pantry page's "Add Ingredient" and "Edit Ingredient" bottom sheets with a Google-style autocomplete dropdown backed by TheMealDB's canonical ingredient list (~600 names).

As the user types, a popover dropdown appears with filtered, ranked suggestions. Selecting a suggestion saves the TheMealDB-canonical name (e.g., `"Chicken Breast"`) to Firestore instead of whatever free-text the user might have typed. This ensures consistent naming across all pantry entries, which is a prerequisite for reliable recipe matching against TheMealDB.

---

## Problem Statement

Prior to this feature, the Pantry page accepted arbitrary free-text for ingredient names. This caused silent failures in the recipe matching engine:

- A user who stored `"pollo"`, `"chkn"`, or `"chix"` would never see recipes calling for `"Chicken"` or `"Chicken Breast"`.
- TheMealDB's recipe engine performs **exact string matching** on ingredient names. Any deviation from its canonical list causes a match miss.
- There was no way for users to know what the canonical form of any given ingredient was.

**Solution:** Surface TheMealDB's own ingredient list as autocomplete suggestions at the point of data entry, making the correct canonical name the path of least resistance.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (FastAPI)                        │
│                                                                 │
│  ┌──────────────────────────┐                                   │
│  │  ingredient_loader.py    │  ← Singleton cache (per process)  │
│  │                          │                                   │
│  │  _cache: list[str]|None  │                                   │
│  │                          │                                   │
│  │  get_mealdb_ingredients()│──────────────────────────────────►│
│  │    └─ if cached, return  │                  TheMealDB API    │
│  │    └─ else, fetch + cache│◄─────────────────────────────────┤
│  └──────────┬───────────────┘  https://www.themealdb.com/       │
│             │  shared by                                        │
│     ┌───────┴──────────┐                                        │
│     │                  │                                        │
│  ┌──▼──────────────┐  ┌▼──────────────────┐                    │
│  │ routes/         │  │ services/          │                    │
│  │ ingredients.py  │  │ glm_ocr_service.py │                    │
│  │                 │  │                    │                    │
│  │ GET /ingredients│  │ (uses same cache   │                    │
│  │ → list[str]     │  │  for OCR matching) │                    │
│  └──────┬──────────┘  └────────────────────┘                    │
└─────────┼───────────────────────────────────────────────────────┘
          │ HTTP (no auth required)
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                       CLIENT (React/TS)                         │
│                                                                 │
│  ┌─────────────────────────────────────┐                        │
│  │  useMealDbIngredients.ts (hook)     │                        │
│  │                                     │                        │
│  │  cached: string[] | null            │  ← Module-level cache  │
│  │  (persists for tab lifetime)        │    (shared across all  │
│  │                                     │     component instances)│
│  │  apiRequest("/ingredients")         │                        │
│  │    └─ fetches once, then returns    │                        │
│  │       from module-level cache       │                        │
│  └────────────────┬────────────────────┘                        │
│                   │ { ingredients, isLoading }                  │
│                   │                                             │
│  ┌────────────────▼────────────────────┐                        │
│  │  Pantry.tsx                         │                        │
│  │                                     │                        │
│  │  const { ingredients }              │                        │
│  │    = useMealDbIngredients()         │                        │
│  │                                     │                        │
│  │  <AutocompleteInput                 │                        │
│  │    value={newName}                  │                        │
│  │    onChange={setNewName}            │                        │
│  │    onSubmit={() => handleAdd()}     │                        │
│  │    suggestions={ingredients}        │                        │
│  │    placeholder="e.g. Chicken breast"│                        │
│  │  />                                 │                        │
│  └────────────────┬────────────────────┘                        │
│                   │                                             │
│  ┌────────────────▼────────────────────┐                        │
│  │  AutocompleteInput.tsx              │                        │
│  │                                     │                        │
│  │  filterAndRank(query, items)        │                        │
│  │    └─ case-insensitive substring    │                        │
│  │    └─ prefix matches sort first     │                        │
│  │    └─ capped at 20 results          │                        │
│  │                                     │                        │
│  │  @radix-ui/react-popover            │                        │
│  │    └─ Trigger: <input>              │                        │
│  │    └─ Content: scrollable <ul>      │                        │
│  └────────────────┬────────────────────┘                        │
│                   │ onChange(canonicalName)                     │
│                   ▼                                             │
│  POST /pantry or PUT /pantry/:id → Firestore                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## File-by-File Breakdown

### `server/app/services/ingredient_loader.py`

**Status:** NEW  
**Purpose:** Fetches the TheMealDB canonical ingredient list and caches it in server process memory.

```python
import httpx
_cache: list[str] | None = None

async def get_mealdb_ingredients() -> list[str]:
    global _cache
    if _cache is not None:
        return _cache
    url = "https://www.themealdb.com/api/json/v1/1/list.php?i=list"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
    data = resp.json()
    _cache = [item["strIngredient"] for item in data.get("meals", []) if item.get("strIngredient")]
    return _cache
```

**Key implementation details:**

| Detail | Description |
|--------|-------------|
| **Cache scope** | Module-level `_cache` variable — lives for the entire server process lifetime. No TTL, no invalidation. One HTTP round-trip to TheMealDB per server restart. |
| **Casing** | Names are preserved exactly as TheMealDB returns them (e.g., `"Chicken Breast"`, not `"chicken breast"`). This casing is required for recipe matching to work correctly. |
| **Async** | `httpx.AsyncClient` is used to avoid blocking the FastAPI event loop. |
| **Timeout** | 10-second timeout on the outbound request to TheMealDB. If TheMealDB is slow or unreachable, the coroutine raises `httpx.TimeoutException`, which propagates up to the route layer. |
| **Filtering** | Items with a falsy `strIngredient` value are excluded by the `if item.get("strIngredient")` guard. |
| **Shared** | This function is imported by both `routes/ingredients.py` (to serve the `/ingredients` endpoint) and `services/glm_ocr_service.py` (for OCR-based ingredient normalization). Any caller gets the same cached list. |

**When does the first fetch happen?**

Lazily — on the first inbound `GET /ingredients` request (or the first OCR job that needs the list). There is no server startup pre-warm. This means the very first user to trigger autocomplete may see a short delay (~1–2 s) while the server fetches from TheMealDB.

---

### `server/app/routes/ingredients.py`

**Status:** NEW  
**Purpose:** Exposes the cached ingredient list as a public REST endpoint.

```python
from fastapi import APIRouter, HTTPException, status
from app.services.ingredient_loader import get_mealdb_ingredients

router = APIRouter(prefix="/ingredients", tags=["ingredients"])

@router.get("", response_model=list[str])
async def list_ingredients() -> list[str]:
    try:
        return await get_mealdb_ingredients()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch ingredient list: {exc}"
        ) from exc
```

**Key implementation details:**

| Detail | Description |
|--------|-------------|
| **Auth** | None required. The ingredient list is public data sourced from a public API. No Firebase token validation is performed. |
| **Route** | `GET /ingredients` — the prefix `"/ingredients"` is set on the router; the handler path is `""` (empty string), so the full path is exactly `/ingredients`. |
| **Error handling** | Any exception from `get_mealdb_ingredients()` (network error, timeout, unexpected shape) is caught and re-raised as HTTP `502 Bad Gateway` with a descriptive detail message. The client interprets a 502 as a graceful degradation (falls back to plain text input). |
| **Response model** | `list[str]` — FastAPI serializes this as a JSON array of strings. |
| **OpenAPI tag** | `"ingredients"` — appears under its own section in the auto-generated `/docs` page. |

---

### `server/app/main.py`

**Status:** MODIFIED  
**Purpose:** Registers the new ingredients router with the FastAPI application.

Two lines were added to the existing `main.py`:

```python
# Added import
from app.routes.ingredients import router as ingredients_router

# Added registration (alongside other routers)
app.include_router(ingredients_router)
```

No other changes were made. The router self-describes its prefix (`/ingredients`), so no prefix needs to be specified at registration time.

---

### `client/src/hooks/useMealDbIngredients.ts`

**Status:** NEW  
**Purpose:** React hook that fetches the ingredient list from the backend once and shares it across all consuming components via a module-level cache.

```typescript
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
    return () => { cancelled = true; };
  }, []);

  return { ingredients, isLoading };
}
```

**Key implementation details:**

| Detail | Description |
|--------|-------------|
| **Cache scope** | `cached` is a module-level variable (outside React). It is shared across every component that calls `useMealDbIngredients()` within the same browser tab session. |
| **First render** | If `cached` is `null`, `ingredients` initializes to `[]` and `isLoading` to `true`. The `useEffect` fires the fetch. |
| **Subsequent renders / mounts** | If `cached` is already populated (another component already fetched), `useState` initializes directly from `cached` and `isLoading` starts as `false`. The `useEffect` exits immediately (`if (cached !== null) return`). Zero additional network requests. |
| **Cancellation** | The `cancelled` flag prevents calling `setIngredients` / `setIsLoading` on an unmounted component (avoids React memory-leak warnings). |
| **Error behavior** | On fetch failure, `isLoading` is set to `false` and `ingredients` remains `[]`. A `console.warn` is logged. The UI degrades silently to a plain text input — no error banner or toast is shown. |
| **`apiRequest`** | Uses the project's custom `apiRequest<T>()` wrapper located at `client/src/lib/api.ts`. This wrapper injects the Firebase auth token into outgoing requests. Because `/ingredients` requires no auth on the server, any token (or even no token if the wrapper handles it) is accepted. |

**Why a module-level cache instead of React Context or Zustand?**

The ingredient list is:
- Fetched once per tab session
- Read-only (never mutated client-side)
- Needed in at most two components simultaneously (Add and Edit bottom sheets)

A module-level variable is the simplest correct solution. No provider setup, no store slice, no risk of context re-render cascades.

---

### `client/src/components/AutocompleteInput.tsx`

**Status:** NEW  
**Purpose:** Reusable autocomplete input component backed by `@radix-ui/react-popover`.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `string` | Yes | Controlled input value |
| `onChange` | `(value: string) => void` | Yes | Called on every keystroke and on suggestion selection |
| `onSubmit` | `() => void` | No | Called when Enter is pressed with no suggestion highlighted, or when Enter selects a suggestion and the form should submit immediately |
| `suggestions` | `string[]` | Yes | Full list of candidate strings (e.g., all ~600 MealDB ingredient names) |
| `placeholder` | `string` | No | Input placeholder text |
| `className` | `string` | No | Additional Tailwind classes forwarded to the `<input>` element |

**Internal structure:**

```
<Popover>           ← @radix-ui/react-popover, open controlled by component state
  <PopoverTrigger asChild>
    <input />       ← the visible text field; all keyboard events handled here
  </PopoverTrigger>
  <PopoverContent>
    <ul>            ← scrollable list, max 20 items
      <li />        ← each suggestion; highlighted item tracked by index
      ...
      <li>No matching ingredient</li>  ← shown when query has text but no matches
    </ul>
  </PopoverContent>
</Popover>
```

**Popover open/close logic:**

- Opens when the input is focused AND `suggestions` is non-empty AND there is text in the input
- Closes on Escape, on blur (with blur-race guard — see below), or on selection
- When `suggestions` is `[]` (loading state or fetch failure), the component renders as a plain `<input>` with no popover — no Radix dependency is exercised

**Blur-race guard:**

When the user clicks a suggestion item, the browser fires `blur` on the input before `click` on the `<li>`. Without mitigation, the popover would close before the click handler fires, swallowing the selection. This is prevented by:

```tsx
onMouseDown={(e) => e.preventDefault()}
```

on each `<li>` element. `preventDefault()` on `mousedown` stops the input from losing focus, so the `click` event fires while the popover is still open.

**"No matching ingredient" hint:**

Shown as a non-interactive list item when:
- The input has text (query length > 0)
- `filterAndRank()` returns an empty array
- `suggestions.length > 0` (i.e., the list loaded successfully)

Submission is **not** blocked when the typed value is not in the list. Users can still save arbitrary ingredient names; the hint is advisory only.

---

### Filtering Algorithm

The `filterAndRank(query: string, items: string[]): string[]` function, defined inside `AutocompleteInput.tsx`, implements the following logic:

1. **Normalize** both query and each candidate to lowercase for case-insensitive comparison.
2. **Filter** to candidates whose lowercase form contains the lowercase query as a substring.
3. **Rank** results: items whose lowercase form *starts with* the lowercase query are placed before items that contain it elsewhere.
4. **Cap** results at 20 items.

```
Example — query: "chi"

Prefix matches (sorted first):
  "Chicken"
  "Chicken Breast"
  "Chilli Powder"
  "Chinese Rice Wine"
  ...

Substring-only matches (sorted after):
  "Ancho Chilli Pepper"
  "Green Chilli"
  ...

(total capped at 20)
```

This ranking mirrors the behavior of common search UIs: items that start with what you typed are more likely to be what you want, so they appear at the top.

---

### Keyboard Navigation Spec

All keyboard handling occurs in the `onKeyDown` handler attached to the `<input>` element.

| Key | Popover closed | Popover open, no highlight | Popover open, item highlighted |
|-----|---------------|---------------------------|-------------------------------|
| `ArrowDown` | Opens popover, highlights first item | Highlights first item | Moves highlight down one item; wraps to first if at end |
| `ArrowUp` | No effect | Highlights last item | Moves highlight up one item; wraps to last if at start |
| `Enter` | Calls `onSubmit?.()` | Calls `onSubmit?.()` | Selects highlighted item via `onChange`, closes popover, calls `onSubmit?.()` |
| `Escape` | No effect | Closes popover, clears highlight | Closes popover, clears highlight |
| Any other key | Normal typing | Normal typing, highlight resets to none | Normal typing, highlight resets to none |

**Highlight state** is an integer index into the filtered results array (or `-1` for no highlight). It resets to `-1` whenever the query changes (i.e., on any non-navigation keystroke).

---

## Data Flow

End-to-end sequence from server startup to Firestore write:

```
1. Server starts
   └─ ingredient_loader._cache = None (not yet fetched)

2. First user opens Pantry page
   └─ useMealDbIngredients() mounts
   └─ cached (module-level) = null → fetch triggered
   └─ GET /ingredients → FastAPI

3. FastAPI handles GET /ingredients
   └─ get_mealdb_ingredients() called
   └─ _cache is None → outbound GET to TheMealDB
   └─ TheMealDB returns ~600 names
   └─ _cache populated
   └─ list[str] returned to client

4. Client receives response
   └─ cached (module-level) = string[]
   └─ useMealDbIngredients sets ingredients state
   └─ AutocompleteInput receives suggestions prop (non-empty)
   └─ Popover is now active

5. User types in the Add Ingredient input
   └─ onChange → setNewName (local state in Pantry.tsx)
   └─ AutocompleteInput receives updated value
   └─ filterAndRank(value, suggestions) runs on each render
   └─ Popover opens with up to 20 filtered results

6. User selects a suggestion (click or Enter)
   └─ onChange(canonicalName) called
   └─ setNewName(canonicalName) in Pantry.tsx
   └─ onSubmit?.() called → handleAdd()

7. handleAdd()
   └─ POST /pantry { name: "Chicken Breast", ... }
   └─ Firestore document created with canonical name

8. Recipe matching
   └─ TheMealDB recipe engine receives "Chicken Breast"
   └─ Exact match found → recipe surfaces correctly
```

---

## Fallback Behavior

The feature is designed to degrade gracefully at every failure point. No degradation is surfaced to the user as an error.

| Failure scenario | Behavior |
|-----------------|----------|
| `GET /ingredients` times out or returns non-2xx | Server returns HTTP 502. Client `catch` block fires, `isLoading` → `false`, `ingredients` stays `[]`. `AutocompleteInput` renders as plain `<input>`. `console.warn` logged. |
| TheMealDB API is down at server startup | Same as above — 502 propagated to client. |
| `suggestions` prop is `[]` | `AutocompleteInput` skips Radix Popover entirely and renders a bare `<input>`. No visual change except absence of dropdown. |
| User types a name not in the list | "No matching ingredient" hint shown inside dropdown. Submission is **not** blocked. The typed value is saved as-is. |
| `@radix-ui/react-popover` missing from `node_modules` | Build fails at compile time. This is a hard dependency. (It was already installed before this feature; no new dep was added.) |
| Component unmounts before fetch resolves | `cancelled = true` cleanup fires. `setState` calls are skipped. No memory leak, no React warning. |
| Second component instance mounts while fetch is in-flight | `useEffect` guard `if (cached !== null) return` does NOT short-circuit because `cached` is still `null`. Both instances independently wait for their `.then()`. The second `.then()` to fire writes `cached` again (idempotent — same data). This is a minor double-write but causes no correctness issue. |

---

## TheMealDB API Reference

| Property | Value |
|----------|-------|
| **Endpoint** | `https://www.themealdb.com/api/json/v1/1/list.php?i=list` |
| **Method** | `GET` |
| **Auth** | None (public free tier) |
| **Typical response size** | ~600 ingredient objects |
| **Response shape** | `{ "meals": [{ "strIngredient": "Chicken" }, ...] }` |
| **Casing** | Mixed — e.g., `"Chicken Breast"`, `"Plain Flour"`, `"soy sauce"`. Casing is preserved exactly; no normalization is applied server-side. |
| **Stability** | The list does not change frequently. The module-level cache (no TTL) is appropriate for this data. |

**Fetching the list manually (for debugging):**

```bash
curl "https://www.themealdb.com/api/json/v1/1/list.php?i=list" | python -m json.tool | head -30
```

---

## Caching Strategy

This feature uses a two-level cache with no TTL at either level.

### Level 1 — Server process memory (`ingredient_loader._cache`)

```
Scope:    Single FastAPI process
Lifetime: Until the process restarts (deploy, crash, etc.)
Shared:   All inbound requests to the same process
Cost:     One outbound HTTPS request to TheMealDB per process lifetime
```

In production with multiple worker processes (e.g., Gunicorn with 4 workers), each worker fetches independently on its first request. With typical Pantry usage this means 4 fetches at most across a deployment cycle.

### Level 2 — Browser tab memory (`useMealDbIngredients.cached`)

```
Scope:    Single browser tab (module-level JS variable)
Lifetime: Until the tab is closed or the page is hard-refreshed
Shared:   All React component instances in the same tab
Cost:     One HTTP request to the GatorChef backend per tab session
```

The user navigating between pages and back to Pantry does NOT re-fetch because the module-level variable survives React unmounts (it is outside the component tree).

---

## Styling Conventions

`AutocompleteInput` uses the project's Tailwind design token classes. Do not use raw color values — use these tokens to stay consistent with the rest of the UI.

| Token | Usage in this component |
|-------|------------------------|
| `bg-secondary` | Dropdown popover background |
| `border-border` | Popover and input border |
| `text-foreground` | Suggestion item text |
| `focus:ring-1 focus:ring-primary` | Input focus ring |

The popover content uses `max-h-60 overflow-y-auto` to scroll when more than ~5 items are visible, keeping the dropdown from overflowing off-screen.

---

## Tech Stack Dependencies

| Dependency | Version constraint | Role in this feature |
|------------|-------------------|---------------------|
| `@radix-ui/react-popover` | Already installed | Accessible, unstyled popover primitive for the dropdown |
| `httpx` | Already in `requirements.txt` | Async HTTP client for server-side TheMealDB fetch |
| `react` | 18.x | Hooks, state, effects |
| `typescript` | Project version | Type safety throughout |
| `tailwindcss` | Project version | Styling via utility classes |
| `firebase` | Project version | Auth token injection via `apiRequest` |

**No new packages were added** by this feature. All dependencies were already present in `package.json` and `requirements.txt`.

---

## Why Canonical Names Matter

TheMealDB's recipe matching is string-based and case-sensitive at the ingredient level. Recipes stored in TheMealDB associate their ingredient slots with exact strings like `"Chicken Breast"` or `"Plain Flour"`.

GatorChef's recipe-matching service (current or planned) queries TheMealDB recipes and checks whether the user's pantry contains required ingredients. The match is done against the ingredient name stored in Firestore.

**Without autocomplete:**

```
User types  →  Stored in Firestore  →  TheMealDB match result
"chkn"         "chkn"                  ❌ no match
"pollo"        "pollo"                 ❌ no match
"Chicken"      "Chicken"               ✅ (if recipe uses "Chicken")
"chicken breast" "chicken breast"      ❌ (TheMealDB stores "Chicken Breast")
```

**With autocomplete:**

```
User selects  →  Stored in Firestore  →  TheMealDB match result
"Chicken Breast"  "Chicken Breast"        ✅ always
```

**Legacy data:** Existing pantry items that were entered before this feature was deployed retain their free-text names. The edit bottom sheet pre-fills with the stored name verbatim, giving the user an opportunity to correct it, but no forced migration runs. This was a deliberate design decision to avoid silently corrupting existing data.

---

## Developer Onboarding Notes

### Adding a new consumer of the ingredient list (frontend)

Import and call the hook:

```typescript
import { useMealDbIngredients } from "@/hooks/useMealDbIngredients";

function MyComponent() {
  const { ingredients, isLoading } = useMealDbIngredients();
  // ingredients is [] while loading, then string[] once fetched
}
```

Pass `ingredients` to `<AutocompleteInput suggestions={ingredients} ... />`. No additional setup required.

### Adding a new consumer of the ingredient list (backend)

```python
from app.services.ingredient_loader import get_mealdb_ingredients

async def my_service_function():
    names = await get_mealdb_ingredients()
    # names is list[str], cached after first call
```

The function is safe to call concurrently — multiple concurrent first calls will each make an outbound request (no lock), but will all populate `_cache` with identical data. This is a minor inefficiency only on cold start.

### Extending the filtering algorithm

`filterAndRank` lives inside `AutocompleteInput.tsx`. If you need more sophisticated ranking (e.g., fuzzy matching, edit-distance scoring), replace this function. The rest of the component is agnostic to the ranking strategy as long as the function signature `(query: string, items: string[]) => string[]` is preserved.

### Resetting the server-side cache (without restart)

There is currently no endpoint or mechanism to invalidate `_cache`. To force a re-fetch of the TheMealDB ingredient list, restart the server process. This is acceptable given how rarely TheMealDB's ingredient list changes.

### Testing the endpoint directly

```bash
# Via the FastAPI dev server
curl http://localhost:8000/ingredients

# Expected: JSON array of ~600 strings
# ["Chicken","Salmon","Beef","Plain Flour", ...]
```

```bash
# Check the OpenAPI docs
open http://localhost:8000/docs#/ingredients/list_ingredients_ingredients__get
```

### Simulating a TheMealDB outage locally

You can test fallback behavior by temporarily breaking the URL in `ingredient_loader.py`:

```python
url = "https://www.themealdb.com/api/json/v1/1/BROKEN"
```

The server returns `502`, the client logs a `console.warn`, and the Pantry inputs render as plain text with no dropdown. Restore the correct URL when done.

---

*This document reflects the implementation as of 2026-04-12. If the component API, endpoint contract, or caching strategy changes, update this file alongside the code.*
