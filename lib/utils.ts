import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Small utility for Tailwind CSS + React easy class name management.
// Merges class names and removes duplicates, useful for conditional class names in React components.
// Example usage:
// <button className={cn(
//   'text-sm bg-blue-500',
//   isActive && 'bg-blue-700',
//   'rounded'
// )}>
//   Click me
// </button>
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
