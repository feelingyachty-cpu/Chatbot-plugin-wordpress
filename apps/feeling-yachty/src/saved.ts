import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_KEY = 'fy.saved';
const RECENT_KEY = 'fy.recent';

export async function loadSavedIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    const parsed = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function saveSavedIds(ids: number[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

export async function loadRecentIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function pushRecentId(id: number): Promise<number[]> {
  const current = await loadRecentIds();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, 12);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}
