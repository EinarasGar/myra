import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@/components/ui/combobox";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectComboboxProps<T extends ComboBoxElement> {
  options: T[];
  placeholder?: string;
  onSelect?: (selectedItem: T | null) => void;
  onSearchValueChange?: (searchValue: string | null) => void;
  isFetching?: boolean;
  className?: string;
  value?: T | null;
  defaultValue?: T | null;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
}

interface GroupEntry<T extends ComboBoxElement> {
  value: string;
  label: string;
  items: T[];
}

function buildGroupedItems<T extends ComboBoxElement>(
  options: T[],
): GroupEntry<T>[] {
  const groupMap = new Map<string, { label: string; items: T[] }>();
  const ungrouped: T[] = [];

  for (const option of options) {
    const groupKey = option.getGroupKey?.();
    if (!groupKey) {
      ungrouped.push(option);
      continue;
    }
    const existing = groupMap.get(groupKey);
    if (existing) {
      existing.items.push(option);
    } else {
      groupMap.set(groupKey, {
        label: option.getGroupLabel?.() ?? groupKey,
        items: [option],
      });
    }
  }

  const groups: GroupEntry<T>[] = [];
  if (ungrouped.length > 0) {
    groups.push({ value: "__ungrouped__", label: "", items: ungrouped });
  }
  for (const [key, { label, items }] of groupMap) {
    groups.push({ value: key, label, items });
  }
  return groups;
}

function ItemContent({ item }: { item: ComboBoxElement }) {
  return (
    <>
      {item.getIcon?.() && <DynamicIcon name={item.getIcon() as IconName} />}
      <span className="flex-1">{item.getLabel()}</span>
      {item.getSuffixIcon?.() && (
        <DynamicIcon
          name={item.getSuffixIcon() as IconName}
          className="ml-auto h-4 w-4 text-muted-foreground"
        />
      )}
    </>
  );
}

export function SelectCombobox<T extends ComboBoxElement>({
  options,
  onSelect,
  onSearchValueChange,
  placeholder = "Select...",
  isFetching,
  className,
  value,
  defaultValue,
  error,
  disabled,
  required,
  "aria-label": ariaLabel,
}: SelectComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<T | null>(
    defaultValue ?? null,
  );

  const currentValue = value ?? selectedStatus;

  const hasGroups = useMemo(
    () => options.some((o) => o.getGroupKey?.()),
    [options],
  );

  const items = useMemo(() => {
    if (hasGroups) return buildGroupedItems(options);
    return options;
  }, [options, hasGroups]);

  const handleValueChange = (newValue: unknown) => {
    const item = newValue as T | null;
    if (!value) {
      setSelectedStatus(item ?? null);
    }
    onSelect?.(item ?? null);
  };

  return (
    <div>
      <Combobox
        items={items}
        value={currentValue}
        open={open}
        onOpenChange={setOpen}
        onValueChange={handleValueChange}
        onInputValueChange={(val) => onSearchValueChange?.(val || null)}
        autoHighlight
        isItemEqualToValue={(a, b) => {
          const elA = a as T;
          const elB = b as T;
          return elA.getKey() === elB.getKey();
        }}
        itemToStringLabel={(item) => {
          const el = item as T;
          if (!el.getLabel) return "";
          return el.getLabel();
        }}
        itemToStringValue={(item) => {
          const el = item as T;
          if (!el.getLabel) return "";
          return [el.getLabel(), ...(el.getKeyWords?.() ?? [])].join(" ");
        }}
      >
        <ComboboxInput
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-required={required}
          aria-invalid={!!error}
          className={cn(error && "border-red-500", className)}
        >
          {isFetching && open && (
            <LoaderCircleIcon className="absolute right-8 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
          )}
        </ComboboxInput>
        <ComboboxContent className="min-w-56">
          <ComboboxEmpty>
            {isFetching ? "Loading..." : "No results found."}
          </ComboboxEmpty>
          <ComboboxList>
            {hasGroups
              ? (group: GroupEntry<T>, index: number) => (
                  <ComboboxGroup key={group.value} items={group.items}>
                    {group.label && (
                      <ComboboxLabel>{group.label}</ComboboxLabel>
                    )}
                    <ComboboxCollection>
                      {(item: T) => (
                        <ComboboxItem key={item.getKey()} value={item}>
                          <ItemContent item={item} />
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                    {index < (items as GroupEntry<T>[]).length - 1 && (
                      <ComboboxSeparator />
                    )}
                  </ComboboxGroup>
                )
              : (item: T) => (
                  <ComboboxItem key={item.getKey()} value={item}>
                    <ItemContent item={item} />
                  </ComboboxItem>
                )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
