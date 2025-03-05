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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Array<T> {
    isNullOrEmpty(): boolean;
  }
}

if (!Array.prototype.isNullOrEmpty) {
  Array.prototype.isNullOrEmpty = function (): boolean {
    return this === null || this === undefined || this.length === 0;
  };
}
