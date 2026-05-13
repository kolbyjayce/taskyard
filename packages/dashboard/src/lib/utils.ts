import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date + "T00:00:00") < new Date(new Date().toDateString());
}

export function isDueSoon(date: string | null): boolean {
  if (!date) return false;
  const due = new Date(date + "T00:00:00");
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}
