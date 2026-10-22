import { useEffect, useState } from 'preact/hooks';
import type { Item } from '../../shared/types';

export interface OpenItem {
  item: Item;
  explored?: boolean;
}

let detail: OpenItem | null = null;
let menu: OpenItem | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const openDetail = (item: Item, explored = false) => {
  detail = { item, explored };
  emit();
};
export const closeDetail = () => {
  detail = null;
  emit();
};
export const openMenu = (item: Item, explored = false) => {
  menu = { item, explored };
  emit();
};
export const closeMenu = () => {
  menu = null;
  emit();
};

export function useUi() {
  const [, setTick] = useState(0);
  const force = () => setTick((x) => x + 1);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return { detail, menu };
}
