import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// HELPERS
// ============================================================

export const formatTime = (totalSeconds) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const formatDate = (iso) => {
  const d = new Date(iso);
  const day = d.getDate();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}  ${hh}:${mi}`;
};

export async function saveGameToHistory(result) {
  try {
    const raw = await AsyncStorage.getItem('@game_history');
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(result);
    await AsyncStorage.setItem('@game_history', JSON.stringify(history));
  } catch (e) { console.error('Save failed', e); }
}

export async function loadGameHistory() {
  try {
    const raw = await AsyncStorage.getItem('@game_history');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export async function clearGameHistory() {
  try { await AsyncStorage.removeItem('@game_history'); } catch (e) { }
}

export async function deleteGameHistoryItem(id) {
  try {
    const raw = await AsyncStorage.getItem('@game_history');
    const history = raw ? JSON.parse(raw) : [];
    const updated = history.filter((item) => item.id !== id);
    await AsyncStorage.setItem('@game_history', JSON.stringify(updated));
    return updated;
  } catch (e) { console.error('Delete failed', e); return null; }
}

export async function saveCustomSports(sports) {
  try { await AsyncStorage.setItem('@custom_sports', JSON.stringify(sports)); } catch (e) { console.error('Save custom sports failed', e); }
}

export async function loadCustomSports() {
  try {
    const raw = await AsyncStorage.getItem('@custom_sports');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
