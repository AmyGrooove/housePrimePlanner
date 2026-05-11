import { useMemo } from "react";

export function useMemoizedValue<T>(value: T, deps: React.DependencyList): T {
  return useMemo(() => value, deps);
}

export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
): T {
  return useMemo(() => callback, deps) as T;
}

export function useMemoizedArray<T>(array: T[], deps: React.DependencyList): T[] {
  return useMemo(() => array, deps);
}

export function useMemoizedObject<T extends object>(obj: T, deps: React.DependencyList): T {
  return useMemo(() => obj, deps);
}
