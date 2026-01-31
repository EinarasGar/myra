"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-nowrap text-sm font-medium">Theme</span>
      </div>
      <div className="flex gap-0.5 items-center h-fit overflow-hidden rounded-full border bg-background p-0">
        <button
          type="button"
          onClick={() => setTheme("system")}
          className={`relative inline-flex justify-center gap-1.5 whitespace-nowrap rounded-md bg-transparent px-2 text-sm font-medium transition-all hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 items-center h-[28px] ${
            theme === "system"
              ? "text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          {theme === "system" && (
            <div className="absolute inset-0 rounded-md bg-accent" />
          )}
          <div className="relative z-10 flex items-center gap-1.5">
            <Monitor className="h-3 w-3" />
            <span className="sr-only">System</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`relative inline-flex justify-center gap-1.5 whitespace-nowrap rounded-md bg-transparent px-2 text-sm font-medium transition-all hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 items-center h-[28px] ${
            theme === "light"
              ? "text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          {theme === "light" && (
            <div className="absolute inset-0 rounded-md bg-accent" />
          )}
          <div className="relative z-10 flex items-center gap-1.5">
            <Sun className="h-3 w-3" />
            <span className="sr-only">Light</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`relative inline-flex justify-center gap-1.5 whitespace-nowrap rounded-md bg-transparent px-2 text-sm font-medium transition-all hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 items-center h-[28px] ${
            theme === "dark"
              ? "text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          {theme === "dark" && (
            <div className="absolute inset-0 rounded-md bg-accent" />
          )}
          <div className="relative z-10 flex items-center gap-1.5">
            <Moon className="h-3 w-3" />
            <span className="sr-only">Dark</span>
          </div>
        </button>
      </div>
    </div>
  );
}
