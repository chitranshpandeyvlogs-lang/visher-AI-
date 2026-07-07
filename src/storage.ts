export interface StorageItem {
  value: string;
}

export interface StorageListResult {
  keys: string[];
}

export const safeStorage = {
  get: async (key: string): Promise<StorageItem | null> => {
    if (typeof window !== 'undefined' && (window as any).storage && typeof (window as any).storage.get === 'function') {
      try {
        const res = await (window as any).storage.get(key);
        if (res && typeof res === 'object' && 'value' in res) {
          return res;
        }
        if (res && typeof res === 'string') {
          return { value: res };
        }
      } catch (e) {
        console.warn("window.storage.get failed, falling back to localStorage:", e);
      }
    }
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      return val !== null ? { value: val } : null;
    }
    return null;
  },

  set: async (key: string, value: string): Promise<boolean> => {
    let success = false;
    if (typeof window !== 'undefined' && (window as any).storage && typeof (window as any).storage.set === 'function') {
      try {
        await (window as any).storage.set(key, value);
        success = true;
      } catch (e) {
        console.warn("window.storage.set failed:", e);
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        success = true;
      } catch (e) {
        console.warn("localStorage.setItem failed:", e);
      }
    }
    return success;
  },

  list: async (prefix: string): Promise<StorageListResult> => {
    if (typeof window !== 'undefined' && (window as any).storage && typeof (window as any).storage.list === 'function') {
      try {
        const res = await (window as any).storage.list(prefix);
        if (res && Array.isArray(res.keys)) {
          return res;
        }
      } catch (e) {
        console.warn("window.storage.list failed, falling back to localStorage:", e);
      }
    }
    const keys: string[] = [];
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keys.push(k);
        }
      }
    }
    return { keys };
  },

  delete: async (key: string): Promise<boolean> => {
    let success = false;
    if (typeof window !== 'undefined' && (window as any).storage && typeof (window as any).storage.delete === 'function') {
      try {
        await (window as any).storage.delete(key);
        success = true;
      } catch (e) {
        console.warn("window.storage.delete failed:", e);
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
        success = true;
      } catch (e) {
        console.warn("localStorage.removeItem failed:", e);
      }
    }
    return success;
  }
};