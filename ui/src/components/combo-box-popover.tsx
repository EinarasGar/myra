import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ComboBoxElement } from "@/interfaces/combo-box-element";
import { DynamicIcon } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";

interface AutocompleteProps<T extends ComboBoxElement> {
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

interface GroupedOptions<T extends ComboBoxElement> {
  [key: string]: T[];
}

export function ComboBoxPopover<T extends ComboBoxElement>({
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
}: AutocompleteProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<T | null>(
    defaultValue ?? null,
  );

  const currentValue = value ?? selectedStatus;

  const [groupedOptions, ungroupedOptions] = useMemo(() => {
    return options.reduce<[GroupedOptions<T>, T[]]>(
      ([groups, ungroups], option) => {
        const groupKey = option.getGroupKey?.();
        if (!groupKey) {
          ungroups.push(option);
          return [groups, ungroups];
        }

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(option);
        return [groups, ungroups];
      },
      [{}, []],
    );
  }, [options]);

  const handleSelect = useCallback(
    (option: T) => {
      if (!value) {
        setSelectedStatus(option);
      }
      setOpen(false);
      onSelect?.(option);
    },
    [value, onSelect],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start overflow-hidden",
            error && "border-red-500",
            className,
          )}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-required={required}
          aria-invalid={!!error}
        >
          {currentValue ? (
            <>
              <span className="truncate">{currentValue.getLabel()}</span>
              {currentValue.getSuffixIcon?.() && (
                <DynamicIcon
                  name={currentValue.getSuffixIcon()}
                  className="ml-auto h-4 w-4 shrink-0 text-muted-foreground"
                />
              )}
            </>
          ) : (
            <span className="truncate text-muted-foreground">
              {placeholder}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" side="bottom" align="start">
        <Command
          filter={(value, search, keywords) => {
            const extendValue = value + " " + keywords?.join(" ");
            if (extendValue.toLowerCase().includes(search.toLowerCase()))
              return 1;
            return 0;
          }}
        >
          <CommandInput
            value={search}
            onValueChange={(val) => {
              setSearch(val);
              onSearchValueChange?.(val || null);
            }}
            placeholder={placeholder}
            loading={isFetching}
          />
          <CommandList>
            <CommandEmpty>
              {isFetching ? "Loading..." : "No results found."}
            </CommandEmpty>
            {ungroupedOptions.length > 0 && (
              <CommandGroup>
                {ungroupedOptions.map((option) => (
                  <CommandItem
                    key={option.getKey()}
                    value={option.getLabel()}
                    keywords={option.getKeyWords?.()}
                    onSelect={() => handleSelect(option)}
                  >
                    {option.getIcon?.() && (
                      <DynamicIcon name={option.getIcon?.()} />
                    )}

                    <span className="flex-1">{option.getLabel()}</span>
                    {option.getSuffixIcon?.() && (
                      <DynamicIcon
                        name={option.getSuffixIcon()}
                        className="ml-auto h-4 w-4 text-muted-foreground"
                      />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {Object.entries(groupedOptions).map(([group, groupOptions]) => (
              <CommandGroup
                key={group}
                heading={groupOptions[0]?.getGroupLabel?.() ?? group}
              >
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.getKey()}
                    value={option.getLabel()}
                    keywords={option.getKeyWords?.()}
                    onSelect={() => handleSelect(option)}
                  >
                    {option.getIcon?.() && (
                      <DynamicIcon name={option.getIcon?.()} />
                    )}

                    <span className="flex-1">{option.getLabel()}</span>
                    {option.getSuffixIcon?.() && (
                      <DynamicIcon
                        name={option.getSuffixIcon()}
                        className="ml-auto h-4 w-4 text-muted-foreground"
                      />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </Popover>
  );
}
