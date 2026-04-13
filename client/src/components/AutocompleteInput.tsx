import { useRef, useState, useCallback, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

const MAX_RESULTS = 20;

function filterAndRank(query: string, items: string[]): string[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();

  const prefix: string[] = [];
  const substring: string[] = [];

  for (const item of items) {
    const itemLower = item.toLowerCase();
    if (itemLower.startsWith(lower)) {
      prefix.push(item);
    } else if (itemLower.includes(lower)) {
      substring.push(item);
    }
  }

  return [...prefix, ...substring].slice(0, MAX_RESULTS);
}

export default function AutocompleteInput({
  value,
  onChange,
  onSubmit,
  suggestions,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = filterAndRank(value, suggestions);
  const hasResults = filtered.length > 0;

  const selectItem = useCallback(
    (item: string) => {
      onChange(item);
      setOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [onChange],
  );

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !hasResults) {
      if (e.key === "Enter") {
        onSubmit?.();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectItem(filtered[highlightIndex]);
        } else {
          onSubmit?.();
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setHighlightIndex(-1);
    if (e.target.value.trim()) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const showPopover = open && hasResults;
  const showNoMatch = open && value.trim().length > 0 && !hasResults && suggestions.length > 0;

  return (
    <Popover.Root open={showPopover} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => value.trim() && setOpen(true)}
            placeholder={placeholder}
            className={
              className ??
              "w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            }
            role="combobox"
            aria-expanded={showPopover}
            aria-autocomplete="list"
            autoComplete="off"
          />
          {showNoMatch && (
            <p className="mt-1 text-xs text-muted-foreground/70">No matching ingredient</p>
          )}
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[60] w-[var(--radix-popover-trigger-width)] max-h-52 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
        >
          <ul ref={listRef} role="listbox">
            {filtered.map((item, i) => (
              <li
                key={item}
                role="option"
                aria-selected={i === highlightIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === highlightIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
