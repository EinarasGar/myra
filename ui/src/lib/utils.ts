import { clsx, type ClassValue } from "clsx";
import { memo } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compareObjects(obj1: object, obj2: object) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export const genericMemo: <T>(component: T) => T = memo;
