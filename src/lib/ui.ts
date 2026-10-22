import { useEffect, useState } from 'preact/hooks';
import type { Item } from '../../shared/types';

export interface OpenItem {
  item: Item;
  explored?: boolean;
}

let detail: OpenItem | null = null;
let menu: OpenItem | null = null;
let notes: Item | null = null;
/** Storie aperte: elenco dei gruppi e gruppo di partenza. */
let stories: { groups: StoryGroup[]; start: number } | null = null;
let activity = false;
/** Id del contenuto il cui video è in riproduzione nel feed (uno solo alla volta). */
let playing: string | null = null;
/** Il video in riproduzione è partito da solo, senza audio. */
let muted = false;
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

export const openNotes = (item: Item) => {
  notes = item;
  emit();
};
export const closeNotes = () => {
  notes = null;
  emit();
};
export const openStories = (groups: StoryGroup[], start: number) => {
  stories = { groups, start };
  stopVideo();
  emit();
};
export const closeStories = () => {
  stories = null;
  emit();
};
export const setActivityOpen = (open: boolean) => {
  activity = open;
  emit();
};

export interface StoryGroup {
  key: string;
  label: string;
  icon: string;
  items: Item[];
}

export const playVideo = (id: string, silent = false) => {
  playing = id;
  muted = silent;
  emit();
};
export const stopVideo = () => {
  if (!playing) return;
  playing = null;
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
  return { detail, menu, playing, muted, notes, stories, activity };
}
