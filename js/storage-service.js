/**
 * NutriDawn — Local Persistence & Future Google Auth Adapter
 * Stores user preferences, saved breakfast favorites, language, and optional BYOK keys
 * privately in browser localStorage. Structured for seamless Phase-2 Google Auth cloud sync.
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

import { APP_CONFIG } from './config.js';

const DEFAULT_PROFILE = Object.freeze({
  ageGroup: 'young_adult',
  gender: 'neutral',
  cuisine: 'bengali',
  dietType: 'vegetarian',
  maxPrepMinutes: 15,
  healthCondition: 'none',
  updatedAt: null
});

/**
 * Safe localStorage wrapper (handles private browsing or restricted iframe sandboxes gracefully)
 */
const SafeStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * 1. User Health & Preference Store (Google Auth Migration Ready)
 */
export const ProfileStore = {
  /**
   * Returns saved user profile merged with safe defaults, plus a flag indicating if user has saved data before.
   */
  get() {
    const raw = SafeStorage.getItem(APP_CONFIG.storageKeys.userProfile);
    if (!raw) {
      return { profile: { ...DEFAULT_PROFILE }, hasSavedProfile: false };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        profile: { ...DEFAULT_PROFILE, ...parsed },
        hasSavedProfile: Boolean(parsed && parsed.updatedAt)
      };
    } catch {
      return { profile: { ...DEFAULT_PROFILE }, hasSavedProfile: false };
    }
  },

  /**
   * Saves updated preferences locally on the user's device.
   * @param {Partial<typeof DEFAULT_PROFILE>} updates
   */
  save(updates) {
    const current = this.get().profile;
    const nextProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    SafeStorage.setItem(APP_CONFIG.storageKeys.userProfile, JSON.stringify(nextProfile));
    return nextProfile;
  },

  /**
   * Clears saved user profile and restores gentle defaults.
   */
  clear() {
    SafeStorage.removeItem(APP_CONFIG.storageKeys.userProfile);
    return { ...DEFAULT_PROFILE };
  },

  /**
   * Phase-2 Hook: Exports local profile + favorites payload for one-click migration
   * once Google Authentication / Firebase is connected.
   */
  exportForCloudSync() {
    return {
      profile: this.get().profile,
      favorites: FavoritesStore.getAll(),
      language: LanguageStore.get()
    };
  }
};

/**
 * 2. Bookmarked Breakfast Recipes Store
 */
export const FavoritesStore = {
  getAll() {
    const raw = SafeStorage.getItem(APP_CONFIG.storageKeys.savedFavorites);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  isSaved(recipeId) {
    return this.getAll().some((item) => item.id === recipeId);
  },

  toggle(recipeObject) {
    if (!recipeObject || !recipeObject.id) return { saved: false, list: this.getAll() };
    const list = this.getAll();
    const existingIndex = list.findIndex((item) => item.id === recipeObject.id);

    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
      SafeStorage.setItem(APP_CONFIG.storageKeys.savedFavorites, JSON.stringify(list));
      return { saved: false, list };
    } else {
      const entry = {
        ...recipeObject,
        savedAt: new Date().toISOString()
      };
      list.unshift(entry);
      // Keep latest 30 saved recipes to stay ultra-lightweight
      const trimmed = list.slice(0, 30);
      SafeStorage.setItem(APP_CONFIG.storageKeys.savedFavorites, JSON.stringify(trimmed));
      return { saved: true, list: trimmed };
    }
  }
};

/**
 * 3. Language Preference Store ('en' | 'bn')
 */
export const LanguageStore = {
  get() {
    const saved = SafeStorage.getItem(APP_CONFIG.storageKeys.language);
    return saved === 'bn' ? 'bn' : 'en';
  },
  set(lang) {
    const valid = lang === 'bn' ? 'bn' : 'en';
    SafeStorage.setItem(APP_CONFIG.storageKeys.language, valid);
    return valid;
  }
};

/**
 * 4. Optional BYOK (Bring Your Own Key) Store
 * Allows power users to use their own Groq or Gemini key directly if desired.
 */
export const ByokStore = {
  get() {
    const raw = SafeStorage.getItem(APP_CONFIG.storageKeys.byokConfig);
    if (!raw) return { provider: 'proxy', apiKey: '' };
    try {
      const parsed = JSON.parse(raw);
      return {
        provider: ['proxy', 'groq', 'gemini'].includes(parsed.provider) ? parsed.provider : 'proxy',
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : ''
      };
    } catch {
      return { provider: 'proxy', apiKey: '' };
    }
  },

  save(provider, apiKey) {
    const payload = {
      provider: ['proxy', 'groq', 'gemini'].includes(provider) ? provider : 'proxy',
      apiKey: typeof apiKey === 'string' ? apiKey.trim() : ''
    };
    SafeStorage.setItem(APP_CONFIG.storageKeys.byokConfig, JSON.stringify(payload));
    return payload;
  },

  clear() {
    SafeStorage.removeItem(APP_CONFIG.storageKeys.byokConfig);
    return { provider: 'proxy', apiKey: '' };
  }
};