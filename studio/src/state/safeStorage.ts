import type { StateStorage } from 'zustand/middleware';

/**
 * localStorage في المتصفح، وذاكرة داخلية عند غيابه (اختبارات Node أو وضع خاص).
 * لا يُرسل أي شيء إلى الخارج؛ التخزين محلي بالكامل.
 */
const memory = new Map<string, string>();

export const safeStorage: StateStorage = {
  getItem: (name) => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(name);
    return memory.get(name) ?? null;
  },
  setItem: (name, value) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(name, value);
      return;
    }
    memory.set(name, value);
  },
  removeItem: (name) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(name);
      return;
    }
    memory.delete(name);
  },
};
