/**
 * NutriDawn — Main Interactive UI Controller
 * Connects Infinite Dynamic Health Quotes, Onboarding, 3 Morning Paths,
 * Pantry Swaps, Unified Morning Grocery Basket + Quick-Commerce Brand Logos,
 * Mise Cooking Mode, Countdown Timer, Bookmarks, and Share Poster Export.
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

import {
  APP_CONFIG,
  AGE_GROUPS,
  GENDERS,
  HEALTH_CONDITIONS,
  CUISINES,
  DIET_TYPES,
  PREP_TIMES
} from './config.js';
import { t, sanitizeBengali } from './i18n-bn.js';
import {
  ProfileStore,
  FavoritesStore,
  LanguageStore,
  ByokStore
} from './storage-service.js';
import { generateBreakfastOptions } from './ai-service.js';
import { resolveDishImage, buildEditorialFallbackSvg } from './media-service.js';
import { groupIngredientsByAisle } from './quick-commerce.js';
import { renderSharePoster, downloadPosterAsPng } from './share-export.js';

const SEEN_QUOTES_KEY = 'nutridawn_seen_quotes_v1';

const CLINICAL_WELLNESS_QUOTES = [
  {
    en: 'A protein- and fiber-rich breakfast stabilizes morning blood glucose and sharpens cognitive focus.',
    bn: 'প্রোটিন ও ফাইবার সমৃদ্ধ সকালের জলখাবার রক্তে শর্করার মাত্রা স্থিতিশীল রাখে এবং মনোযোগ বাড়ায়।',
    authorEn: 'ICMR–National Institute of Nutrition (NIN)',
    authorBn: 'আইসিএমআর – ন্যাশনাল ইনস্টিটিউট অফ নিউট্রিশন (NIN)'
  },
  {
    en: 'Limiting daily sodium below 5 grams and starting the morning with potassium-rich foods supports healthy blood pressure.',
    bn: 'দৈনিক লবণ ৫ গ্রামের নিচে রাখা এবং পটাশিয়াম সমৃদ্ধ সকালের খাবার রক্তচাপ নিয়ন্ত্রণে সহায়তা করে।',
    authorEn: 'World Health Organization (WHO) Dietary Guideline',
    authorBn: 'বিশ্ব স্বাস্থ্য সংস্থা (WHO) খাদ্য নির্দেশিকা'
  },
  {
    en: 'Pairing plant-based iron from poha or greens with fresh vitamin C boosts iron absorption up to threefold.',
    bn: 'চিঁড়ে বা শাকসবজির আয়রনের সাথে তাজা লেবুর ভিটামিন-সি মেশালে শরীরে আয়রন শোষণ তিনগুণ পর্যন্ত বাড়ে।',
    authorEn: 'Indian Medical Association (IMA) Wellness Advisory',
    authorBn: 'ইন্ডিয়ান মেডিকেল অ্যাসোসিয়েশন (IMA) স্বাস্থ্য পরামর্শ'
  },
  {
    en: 'Whole grains, pulses, nuts, and seasonal fruits at dawn protect long-term cardiovascular and metabolic health.',
    bn: 'সকালে গোটা শস্য, ডাল, বাদাম ও মৌসুমি ফল গ্রহণ দীর্ঘমেয়াদী হৃদযন্ত্র ও বিপাকীয় সুস্থতা রক্ষা করে।',
    authorEn: 'WHO Healthy Diet Fact Sheet',
    authorBn: 'বিশ্ব স্বাস্থ্য সংস্থা (WHO) সুষম খাদ্য নির্দেশিকা'
  },
  {
    en: 'Gentle morning hydration followed by warm, easily digestible nourishment kindles healthy digestive rhythm.',
    bn: 'সকালে হালকা উষ্ণ জল ও সহজপাচ্য পুষ্টিকর জলখাবার সারাদিনের হজমশক্তি স্বাভাবিক রাখে।',
    authorEn: 'ICMR-NIN Dietary Guidelines for Indians',
    authorBn: 'আইসিএমআর-এনআইএন ভারতীয় খাদ্য নির্দেশিকা'
  },
  {
    en: 'Replacing refined sugars with complex slow-release carbohydrates prevents mid-morning fatigue and cravings.',
    bn: 'পরিশোধিত চিনির বদলে জটিল ও ধীরে হজম হওয়া শর্করা সকালের ক্লান্তি ও হঠাৎ ক্ষুধা প্রতিরোধ করে।',
    authorEn: 'Clinical Preventive Nutrition Principle',
    authorBn: 'ক্লিনিক্যাল প্রিভেন্টিভ নিউট্রিশন নীতি'
  }
];

const state = {
  lang: LanguageStore.get(),
  profile: ProfileStore.get().profile,
  hasSavedProfile: ProfileStore.get().hasSavedProfile,
  options: [],
  resolvedImages: new Map(),
  activeRecipe: null,
  checkedIngredients: new Set(),
  basketItems: [], // { key, displayName, quantity, englishSearchQuery, recipeTitle }
  swapApplied: false,
  cookingMode: false,
  activeStepIndex: 0,
  timerSecondsLeft: 900,
  timerInterval: null,
  timerRunning: false,
  currentQuote: null
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message) {
  const toast = document.getElementById('ndToast');
  if (!toast) return;
  toast.textContent = state.lang === 'bn' ? sanitizeBengali(message) : message;
  toast.classList.remove('hidden');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

/**
 * 1. Infinite Dynamic Health Quote Engine (Live Open API + Unseen Local Rotation)
 */
async function loadDynamicHealthQuote(forceRemote = true) {
  const quoteEl = document.getElementById('dynamicHealthQuoteText');
  const authorEl = document.getElementById('dynamicHealthQuoteAuthor');
  if (!quoteEl || !authorEl) return;

  // Step A: Pick an unseen quote immediately from our clinical bank so there is zero delay
  let seenIndices = [];
  try {
    seenIndices = JSON.parse(localStorage.getItem(SEEN_QUOTES_KEY) || '[]');
  } catch {
    seenIndices = [];
  }

  let availableIndices = CLINICAL_WELLNESS_QUOTES.map((_, i) => i).filter(
    (i) => !seenIndices.includes(i)
  );
  if (availableIndices.length === 0) {
    seenIndices = [];
    availableIndices = CLINICAL_WELLNESS_QUOTES.map((_, i) => i);
  }

  const chosenIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  seenIndices.push(chosenIdx);
  try {
    localStorage.setItem(SEEN_QUOTES_KEY, JSON.stringify(seenIndices));
  } catch {
    // Ignore storage quota errors
  }

  state.currentQuote = CLINICAL_WELLNESS_QUOTES[chosenIdx];
  renderCurrentQuote();

  // Step B: In English mode, also attempt a fresh live wisdom quote from free zero-key API so quotes never exhaust
  if (forceRemote && state.lang === 'en' && navigator.onLine !== false) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('https://dummyjson.com/quotes/random', { signal: controller.signal });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        if (data?.quote && data.quote.length < 150) {
          state.currentQuote = {
            ...state.currentQuote,
            en: data.quote,
            authorEn: `${data.author} • Morning Reflection`
          };
          renderCurrentQuote();
        }
      }
    } catch {
      // Silently keep the verified clinical quote already displayed
    }
  }
}

function renderCurrentQuote() {
  const quoteEl = document.getElementById('dynamicHealthQuoteText');
  const authorEl = document.getElementById('dynamicHealthQuoteAuthor');
  if (!quoteEl || !authorEl || !state.currentQuote) return;

  const isBn = state.lang === 'bn';
  const text = isBn ? sanitizeBengali(state.currentQuote.bn) : state.currentQuote.en;
  const author = isBn ? sanitizeBengali(state.currentQuote.authorBn) : state.currentQuote.authorEn;

  quoteEl.textContent = `“${text}”`;
  authorEl.textContent = `— ${author}`;
}

/**
 * 2. Apply Language & Static Editorial Copy
 */
function applyLanguageBindings() {
  document.documentElement.lang = state.lang;
  const isBn = state.lang === 'bn';

  const langEnBtn = document.getElementById('langEnBtn');
  const langBnBtn = document.getElementById('langBnBtn');
  if (langEnBtn && langBnBtn) {
    langEnBtn.className = isBn
      ? 'px-3 py-1 rounded-full text-white hover:bg-white/15 font-label-sm text-xs transition-all'
      : 'px-3 py-1 rounded-full bg-white text-primary font-label-sm text-xs font-bold shadow-xs transition-all';
    langBnBtn.className = isBn
      ? 'px-3 py-1 rounded-full bg-white text-primary font-label-sm text-xs font-bold shadow-xs transition-all'
      : 'px-3 py-1 rounded-full text-white hover:bg-white/15 font-label-sm text-xs transition-all';
  }

  const textBindings = {
    headerTagline: t(state.lang, 'tagline'),
    headerBasketLabel: isBn ? 'ঝুড়ি' : 'Basket',
    returningUserText: t(state.lang, 'savedWelcomeBack'),
    resetSavedProfileBtn: t(state.lang, 'clearPrefsBtn'),
    heroHeading: t(state.lang, 'welcomeHeading'),
    heroSubtext: t(state.lang, 'welcomeSubtext'),
    step1PromptText: t(state.lang, 'step1Prompt'),
    step1SubpromptText: t(state.lang, 'step1Subprompt'),
    step2PromptText: t(state.lang, 'step2Prompt'),
    step3PromptText: t(state.lang, 'step3Prompt'),
    privacyNoteText: t(state.lang, 'privacyNote'),
    generateIdeasBtnLabel: t(state.lang, 'generateOptionsBtn'),
    loadingText: t(state.lang, 'generatingLoader'),
    optionsTitle: t(state.lang, 'optionsSectionTitle'),
    optionsSubtitle: isBn
      ? 'যেকোনো একটি বিকল্প বেছে নিন — ধাপে ধাপে রান্নার নিয়ম ও গ্রোসারি ঝুড়ি দেখতে পাবেন।'
      : 'Pick any one option below to view step-by-step instructions, ingredients, and your Morning Grocery Basket.'
  };

  Object.entries(textBindings).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const footerEl = document.getElementById('footerDisclaimerText');
  if (footerEl) {
    footerEl.innerHTML = isBn
      ? sanitizeBengali(
          '<strong>ক্লিনিক্যাল ও পুষ্টি নির্দেশিকা:</strong> NutriDawn-এর বিশেষ ডায়েট পরামর্শসমূহ (যেমন ডায়াবেটিক ও উচ্চ রক্তচাপ যত্ন) <strong>বিশ্ব স্বাস্থ্য সংস্থা (WHO)</strong>, <strong>ইন্ডিয়ান মেডিকেল অ্যাসোসিয়েশন (IMA)</strong> এবং <strong>ICMR–ন্যাশনাল ইনস্টিটিউট অফ নিউট্রিশন (NIN)</strong>-এর সাধারণ খাদ্য নির্দেশিকা অনুসরণ করে তৈরি। এটি দৈনন্দিন সুস্বাস্থ্যের সহায়ক এবং চিকিৎসকের পরামর্শের বিকল্প নয়।'
        )
      : '<strong>Clinical &amp; Wellness Alignment:</strong> NutriDawn’s therapeutic meal parameters (such as Low-GI Diabetic Care and Low-Sodium Hypertension Care) are formulated in alignment with general dietary guidelines issued by the <strong>World Health Organization (WHO)</strong>, the <strong>Indian Medical Association (IMA)</strong>, and <strong>ICMR–National Institute of Nutrition (NIN)</strong>. These suggestions support everyday healthy eating and do not replace individualized medical advice from your physician or registered dietitian.';
  }

  renderCurrentQuote();
  renderOnboardingPills();
  updateSavedCountBadge();
  updateBasketCountBadge();
  if (state.options.length > 0) renderOptionsGrid();
  if (state.activeRecipe) renderActiveRecipeDetail();
}

/**
 * 3. Render Gentle Onboarding Pill Selectors
 */
function renderOnboardingPills() {
  const isBn = state.lang === 'bn';

  const renderGroup = (mountId, list, activeVal, attrName) => {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    mount.innerHTML = list
      .map((item) => {
        const isActive = String(activeVal) === String(item.id) ? 'active' : '';
        const label = isBn ? sanitizeBengali(item.labelBn) : item.labelEn;
        const iconHtml = item.icon ? `<span>${item.icon}</span>` : '';
        return `<button type="button" data-${attrName}="${item.id}" class="nd-pill-btn ${isActive}">
          ${iconHtml}
          <span>${escapeHtml(label)}</span>
        </button>`;
      })
      .join('');
  };

  renderGroup('ageGroupPills', AGE_GROUPS, state.profile.ageGroup, 'age');
  renderGroup('genderPills', GENDERS, state.profile.gender, 'gender');
  renderGroup('cuisinePills', CUISINES, state.profile.cuisine, 'cuisine');
  renderGroup('dietPills', DIET_TYPES, state.profile.dietType, 'diet');
  renderGroup('prepTimePills', PREP_TIMES, state.profile.maxPrepMinutes, 'prep');
  renderGroup('conditionPills', HEALTH_CONDITIONS, state.profile.healthCondition, 'condition');

  updateBaselineNutritionPreview();
}

function updateBaselineNutritionPreview() {
  const previewEl = document.getElementById('baselineNutritionPreview');
  if (!previewEl) return;

  const isBn = state.lang === 'bn';
  const ageObj = AGE_GROUPS.find((a) => a.id === state.profile.ageGroup) || AGE_GROUPS[2];
  const genderObj = GENDERS.find((g) => g.id === state.profile.gender) || GENDERS[2];
  const condObj = HEALTH_CONDITIONS.find((c) => c.id === state.profile.healthCondition) || HEALTH_CONDITIONS[0];

  if (condObj.id === 'none') {
    previewEl.textContent = isBn
      ? `${sanitizeBengali(ageObj.baselineNutrientsBn)} • ${sanitizeBengali(genderObj.micronutrientFocusBn)}`
      : `${ageObj.baselineNutrientsEn} • ${genderObj.micronutrientFocusEn}`;
  } else {
    previewEl.textContent = isBn
      ? `${sanitizeBengali(condObj.labelBn)}: ${sanitizeBengali(ageObj.baselineNutrientsBn)}`
      : `${condObj.labelEn}: ${condObj.clinicalPromptRule}`;
  }
}

function updateProfileSelection(updates) {
  state.profile = ProfileStore.save(updates);
  state.hasSavedProfile = true;
  renderOnboardingPills();
}

/**
 * 4. Fetch 3 Morning Options & Hydrate Real Food Photos (Wikimedia / Openverse)
 */
async function handleGenerateOptions(forceRefresh = false) {
  const loadingSec = document.getElementById('loadingSection');
  const optionsSec = document.getElementById('options-section');
  const recipeSec = document.getElementById('recipe-detail-section');
  const offlineBanner = document.getElementById('offlineDisclaimerBanner');

  if (loadingSec) loadingSec.classList.remove('hidden');
  if (optionsSec) optionsSec.classList.add('hidden');
  if (recipeSec) recipeSec.classList.add('hidden');

  const { options, source } = await generateBreakfastOptions(state.profile, state.lang, forceRefresh);
  state.options = options;

  if (loadingSec) loadingSec.classList.add('hidden');

  if (offlineBanner) {
    if (source === 'curated-fallback' || source === 'curated-local') {
      offlineBanner.classList.remove('hidden');
    } else {
      offlineBanner.classList.add('hidden');
    }
  }

  renderOptionsGrid();
  if (optionsSec) {
    optionsSec.classList.remove('hidden');
    optionsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Hydrate each dish photo independently from Wikimedia Commons / Openverse
  options.forEach(async (opt) => {
    const media = await resolveDishImage(opt.photoKeywords, opt.title);
    state.resolvedImages.set(opt.id, media);
    const imgEl = document.getElementById(`opt-img-${opt.id}`);
    const badgeEl = document.getElementById(`opt-badge-${opt.id}`);
    if (imgEl) {
      imgEl.src = media.url;
    }
    if (badgeEl) {
      badgeEl.textContent =
        media.sourceType === 'stock'
          ? state.lang === 'bn'
            ? 'বাস্তব খাবারের ছবি'
            : 'Wikimedia / CC0 Photo'
          : state.lang === 'bn'
          ? 'রেসিপি ইলাস্ট্রেশন'
          : 'Editorial Plate';
    }
  });
}

/**
 * 5. Render Stage A: 3 Balanced Morning Path Cards
 */
function renderOptionsGrid() {
  const grid = document.getElementById('optionsGrid');
  if (!grid) return;

  const isBn = state.lang === 'bn';
  const fmt = (val) => escapeHtml(isBn ? sanitizeBengali(val) : val);

  grid.innerHTML = state.options
    .map((opt) => {
      const media = state.resolvedImages.get(opt.id);
      const imgSrc = media ? media.url : buildEditorialFallbackSvg(opt.title);
      const badgeLabel = media
        ? media.sourceType === 'stock'
          ? isBn
            ? 'বাস্তব খাবারের ছবি'
            : 'Wikimedia / CC0 Photo'
          : isBn
          ? 'রেসিপি ইলাস্ট্রেশন'
          : 'Editorial Plate'
        : isBn
        ? 'ছবি লোড হচ্ছে...'
        : 'Loading Photo...';
      const isSaved = FavoritesStore.isSaved(opt.id);

      const totalMacros = (opt.proteinGrams || 15) + (opt.carbsGrams || 30) + (opt.fatGrams || 8);
      const protPct = Math.round(((opt.proteinGrams || 15) / totalMacros) * 100);
      const carbPct = Math.round(((opt.carbsGrams || 30) / totalMacros) * 100);
      const fatPct = Math.max(10, 100 - protPct - carbPct);

      return `
      <article class="nd-editorial-card p-4 md:p-5 flex flex-col justify-between group">
        <div>
          <div class="relative w-full h-48 rounded-2xl overflow-hidden mb-4 bg-surface-container">
            <img
              id="opt-img-${opt.id}"
              src="${imgSrc}"
              alt="${fmt(opt.title)}"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onerror="this.onerror=null;this.src='${buildEditorialFallbackSvg(opt.title)}';"
            />
            <span class="absolute top-3 left-3 px-3 py-0.5 rounded-full bg-white/95 font-label-sm text-xs text-primary font-bold shadow-xs">
              ${fmt(opt.categoryTag)}
            </span>
            <span id="opt-badge-${opt.id}" class="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-on-surface/80 text-white font-label-sm text-[11px]">
              ${escapeHtml(badgeLabel)}
            </span>
            <span class="absolute bottom-3 right-3 px-3 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-bold">
              ${opt.prepMinutes}m
            </span>
            <button
              type="button"
              data-bookmark-id="${opt.id}"
              aria-label="Bookmark Recipe"
              class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-xs text-base ${
                isSaved ? 'text-primary' : 'text-on-surface-variant'
              } hover:text-primary transition-colors"
            >
              ${isSaved ? '❤️' : '🤍'}
            </button>
          </div>

          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-xs font-bold">
              ${fmt(opt.glycemicTag)}
            </span>
            <span class="font-label-sm text-xs text-on-surface-variant font-bold">
              ${opt.calories} kcal
            </span>
          </div>

          <h3 class="font-headline-md text-2xl text-on-surface mb-1 leading-snug">
            ${fmt(opt.title)}
          </h3>
          <p class="font-body-sm text-sm text-on-surface-variant mb-3">
            ${fmt(opt.subtitle)}
          </p>

          <!-- Macro Spark Track -->
          <div class="bg-surface-container-low p-3 rounded-xl mb-3 border border-outline-variant/40">
            <div class="flex justify-between font-label-sm text-xs text-on-surface mb-1.5">
              <span>${isBn ? 'প্রোটিন' : 'Protein'} <strong class="text-primary">${opt.proteinGrams}g</strong></span>
              <span>${isBn ? 'শর্করা' : 'Carbs'} <strong class="text-secondary">${opt.carbsGrams}g</strong></span>
              <span>${isBn ? 'ফ্যাট' : 'Fat'} <strong class="text-tertiary">${opt.fatGrams}g</strong></span>
            </div>
            <div class="w-full h-2 rounded-full bg-surface-container flex overflow-hidden">
              <div class="bg-primary h-full" style="width: ${protPct}%"></div>
              <div class="bg-secondary-container h-full" style="width: ${carbPct}%"></div>
              <div class="bg-tertiary h-full" style="width: ${fatPct}%"></div>
            </div>
          </div>

          <p class="font-body-sm text-xs text-on-surface-variant bg-surface-container/55 p-2.5 rounded-xl mb-4">
            <strong class="text-primary">${isBn ? 'পুষ্টিগুণ:' : 'Why it fits:'}</strong> ${fmt(opt.healthRationale)}
          </p>
        </div>

        <button type="button" data-select-recipe="${opt.id}" class="nd-btn-primary w-full">
          <span>🍽️</span>
          <span>${escapeHtml(t(state.lang, 'chooseRecipeBtn'))}</span>
        </button>
      </article>`;
    })
    .join('');
}

/**
 * 6. Unified Morning Grocery Basket Cart Helpers
 */
function makeBasketKey(recipeId, ingIndex) {
  return `${recipeId}::${ingIndex}`;
}

function isIngredientInBasket(recipeId, ingIndex) {
  const key = makeBasketKey(recipeId, ingIndex);
  return state.basketItems.some((item) => item.key === key);
}

function toggleBasketIngredient(recipe, ingIndex) {
  const ing = recipe?.ingredients?.[ingIndex];
  if (!ing) return;

  const key = makeBasketKey(recipe.id, ingIndex);
  const existingIdx = state.basketItems.findIndex((item) => item.key === key);

  if (existingIdx >= 0) {
    state.basketItems.splice(existingIdx, 1);
    showToast(state.lang === 'bn' ? 'ঝুড়ি থেকে সরানো হয়েছে' : 'Removed from Morning Basket');
  } else {
    state.basketItems.push({
      key,
      displayName: ing.displayName,
      quantity: ing.quantity,
      englishSearchQuery: ing.englishSearchQuery || ing.displayName,
      recipeTitle: recipe.title
    });
    showToast(
      state.lang === 'bn'
        ? `🧺 "${ing.displayName}" ঝুড়িতে যোগ করা হয়েছে`
        : `🧺 Added "${ing.displayName}" to Morning Basket`
    );
  }

  updateBasketCountBadge();
  renderActiveRecipeDetail();
}

function addAllMissingToBasket(recipe) {
  if (!recipe || !Array.isArray(recipe.ingredients)) return;
  let addedCount = 0;

  recipe.ingredients.forEach((ing, idx) => {
    if (!state.checkedIngredients.has(idx) && !isIngredientInBasket(recipe.id, idx)) {
      state.basketItems.push({
        key: makeBasketKey(recipe.id, idx),
        displayName: ing.displayName,
        quantity: ing.quantity,
        englishSearchQuery: ing.englishSearchQuery || ing.displayName,
        recipeTitle: recipe.title
      });
      addedCount += 1;
    }
  });

  updateBasketCountBadge();
  renderActiveRecipeDetail();
  openBasketModal();

  if (addedCount > 0) {
    showToast(
      state.lang === 'bn'
        ? `🧺 ${addedCount}টি উপকরণ গ্রোসারি ঝুড়িতে যোগ হয়েছে!`
        : `🧺 Added ${addedCount} missing items to your Morning Basket!`
    );
  }
}

function updateBasketCountBadge() {
  const badge = document.getElementById('headerBasketCount');
  if (badge) badge.textContent = String(state.basketItems.length);
}

function formatBasketClipboardText() {
  if (state.basketItems.length === 0) return '';
  const lines = state.basketItems.map(
    (item, idx) => `${idx + 1}. ${item.englishSearchQuery} (${item.quantity})`
  );
  return `NutriDawn Morning Grocery Basket:\n${lines.join('\n')}`;
}

function openBasketModal() {
  const modal = document.getElementById('basketModal');
  const itemsMount = document.getElementById('basketItemsMount');
  const logosGrid = document.getElementById('quickCommerceLogosGrid');
  if (!modal || !itemsMount || !logosGrid) return;

  const isBn = state.lang === 'bn';
  const fmt = (val) => escapeHtml(isBn ? sanitizeBengali(val) : val);
  const count = state.basketItems.length;

  if (count === 0) {
    itemsMount.innerHTML = `
      <div class="p-6 text-center rounded-2xl bg-surface-container-low border border-outline-variant">
        <p class="font-body-md text-sm text-on-surface-variant">
          ${
            isBn
              ? 'আপনার সকালের ঝুড়ি এখন খালি। যেকোনো রেসিপি খুলে "+ ঝুড়িতে যোগ করুন" বোতামে চাপ দিন।'
              : 'Your Morning Grocery Basket is empty. Open any recipe and tap "+ Add to Basket" on ingredients you need.'
          }
        </p>
      </div>`;
  } else {
    itemsMount.innerHTML = state.basketItems
      .map(
        (item, idx) => `
      <div class="p-3 rounded-xl bg-white border border-outline-variant flex items-center justify-between gap-2">
        <div>
          <span class="font-body-md text-sm font-bold text-on-surface">${fmt(item.displayName)}</span>
          <span class="ml-2 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold">${fmt(
            item.quantity
          )}</span>
          <span class="block text-[11px] text-on-surface-variant">${fmt(item.recipeTitle)}</span>
        </div>
        <button type="button" data-remove-basket-idx="${idx}" class="px-2.5 py-1 rounded-full bg-surface-container text-xs text-primary font-bold hover:bg-primary hover:text-white transition-colors">
          ✕
        </button>
      </div>`
      )
      .join('');
  }

  const firstQuery = encodeURIComponent(
    state.basketItems[0]?.englishSearchQuery || 'healthy breakfast groceries'
  );

  // Quick-Commerce Partner Brand Logos with Live Cart Item Count Badges
  const partners = [
    {
      name: 'Blinkit',
      eta: '10–15 mins',
      url: `https://blinkit.com/s/?q=${firstQuery}`,
      logoSvg: `<svg viewBox="0 0 120 44" class="h-9 w-auto"><rect width="120" height="44" rx="10" fill="#F8CB46"/><text x="60" y="28" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#1C1C1C" text-anchor="middle">blink<tspan fill="#0C831F">it</tspan></text></svg>`
    },
    {
      name: 'Zepto',
      eta: '10 mins',
      url: `https://www.zeptonow.com/search?query=${firstQuery}`,
      logoSvg: `<svg viewBox="0 0 120 44" class="h-9 w-auto"><rect width="120" height="44" rx="10" fill="#3B006A"/><text x="60" y="28" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#FF3269" text-anchor="middle">zepto</text></svg>`
    },
    {
      name: 'Instamart',
      eta: '15–20 mins',
      url: `https://www.swiggy.com/instamart/search?custom_back=true&query=${firstQuery}`,
      logoSvg: `<svg viewBox="0 0 120 44" class="h-9 w-auto"><rect width="120" height="44" rx="10" fill="#FC8019"/><text x="60" y="27" font-family="Arial, sans-serif" font-weight="800" font-size="16" fill="#FFFFFF" text-anchor="middle">Instamart</text></svg>`
    },
    {
      name: 'BigBasket',
      eta: 'Express',
      url: `https://www.bigbasket.com/ps/?q=${firstQuery}`,
      logoSvg: `<svg viewBox="0 0 120 44" class="h-9 w-auto"><rect width="120" height="44" rx="10" fill="#84C225"/><text x="60" y="27" font-family="Arial, sans-serif" font-weight="900" font-size="16" fill="#FFFFFF" text-anchor="middle">big<tspan fill="#1F2937">basket</tspan></text></svg>`
    }
  ];

  logosGrid.innerHTML = partners
    .map(
      (p) => `
    <a href="${p.url}" target="_blank" rel="noopener noreferrer" data-qc-launch="${p.name}" class="qc-store-card">
      ${count > 0 ? `<span class="qc-cart-badge">${count}</span>` : ''}
      ${p.logoSvg}
      <span class="font-label-sm text-xs font-bold text-on-surface">${p.name}</span>
      <span class="text-[11px] text-on-surface-variant">${p.eta}</span>
    </a>`
    )
    .join('');

  modal.classList.remove('hidden');
}

/**
 * 7. Render Stage B: Full Recipe Detail, Basket Integration & Mise Cook Mode
 */
function selectRecipeForCooking(recipeId) {
  const found =
    state.options.find((o) => o.id === recipeId) ||
    FavoritesStore.getAll().find((o) => o.id === recipeId);
  if (!found) return;

  state.activeRecipe = found;
  state.checkedIngredients = new Set();
  state.swapApplied = false;
  state.activeStepIndex = 0;
  resetCookTimer((found.prepMinutes || 15) * 60);

  renderActiveRecipeDetail();

  const detailSec = document.getElementById('recipe-detail-section');
  if (detailSec) {
    detailSec.classList.remove('hidden');
    detailSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderActiveRecipeDetail() {
  const detailSec = document.getElementById('recipe-detail-section');
  const recipe = state.activeRecipe;
  if (!detailSec || !recipe) return;

  const isBn = state.lang === 'bn';
  const fmt = (val) => escapeHtml(isBn ? sanitizeBengali(val) : val);
  const media = state.resolvedImages.get(recipe.id);
  const imgUrl = media ? media.url : buildEditorialFallbackSvg(recipe.title);

  const groupedAisles = groupIngredientsByAisle(recipe.ingredients || [], state.checkedIngredients);

  const aislesHtml = groupedAisles
    .map((group) => {
      const rowsHtml = group.items
        .map((ing) => {
          const isSwappedRow =
            state.swapApplied &&
            recipe.pantrySwap &&
            ing.displayName
              .toLowerCase()
              .includes(recipe.pantrySwap.original.toLowerCase().slice(0, 5));
          const displayTitle = isSwappedRow
            ? `${recipe.pantrySwap.replacement} (${isBn ? 'বিকল্প' : 'Swapped'})`
            : ing.displayName;

          const inBasket = isIngredientInBasket(recipe.id, ing.index);

          let actionHtml = '';
          if (ing.inPantry) {
            actionHtml = `<span class="font-label-sm text-xs text-green-700 font-bold">✓ ${
              isBn ? 'ঘরে আছে' : 'In Pantry'
            }</span>`;
          } else {
            actionHtml = `
              <button type="button" data-basket-ing-idx="${ing.index}" class="nd-pill-btn ${
              inBasket ? 'active' : ''
            } !min-h-[34px] !py-1 !px-3 !text-xs">
                ${
                  inBasket
                    ? isBn
                      ? '✓ ঝুড়িতে আছে'
                      : '✓ In Basket'
                    : isBn
                    ? '+ ঝুড়িতে যোগ করুন'
                    : '+ Add to Basket'
                }
              </button>`;
          }

          return `
          <div class="nd-ingredient-row ${ing.inPantry ? 'in-pantry' : ''}">
            <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-[200px]">
              <input type="checkbox" data-toggle-ing="${ing.index}" ${
            ing.inPantry ? 'checked' : ''
          } class="w-5 h-5 accent-primary rounded cursor-pointer" />
              <span class="nd-qty-badge">${fmt(ing.quantity)}</span>
              <span class="nd-ing-name font-body-md text-sm md:text-base font-semibold text-on-surface">${fmt(
                displayTitle
              )}</span>
            </label>
            <div class="flex items-center gap-2">
              ${actionHtml}
            </div>
          </div>`;
        })
        .join('');

      return `
      <div class="mb-4">
        <span class="block font-label-sm text-xs text-secondary uppercase tracking-wider mb-2">${fmt(
          group.aisle
        )}</span>
        <div class="space-y-2">${rowsHtml}</div>
      </div>`;
    })
    .join('');

  const stepsHtml = (recipe.steps || [])
    .map((step, idx) => {
      const isActive = idx === state.activeStepIndex ? 'active-step' : '';
      return `
      <div data-step-idx="${idx}" class="nd-step-card ${isActive} cursor-pointer">
        <div class="flex items-start gap-3">
          <span class="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-lg flex items-center justify-center shrink-0">
            ${idx + 1}
          </span>
          <p class="font-body-md text-on-surface flex-1">${fmt(step)}</p>
        </div>
      </div>`;
    })
    .join('');

  const swapBoxHtml = recipe.pantrySwap
    ? `
    <div class="p-4 rounded-2xl bg-surface-container border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-start gap-2.5">
        <span class="text-secondary text-lg">⇄</span>
        <div>
          <span class="block font-label-sm text-xs text-secondary uppercase">${escapeHtml(
            t(state.lang, 'pantrySwapTitle')
          )}</span>
          <p class="font-body-sm text-sm text-on-surface">
            <strong>${fmt(recipe.pantrySwap.original)}</strong> ➔ <strong class="text-primary">${fmt(
        recipe.pantrySwap.replacement
      )}</strong>
            <span class="block text-xs text-on-surface-variant mt-0.5">${fmt(
              recipe.pantrySwap.impactNote
            )}</span>
          </p>
        </div>
      </div>
      <button id="togglePantrySwapBtn" type="button" class="nd-pill-btn ${
        state.swapApplied ? 'active' : ''
      } shrink-0">
        ${
          state.swapApplied
            ? isBn
              ? 'মূল উপকরণে ফিরুন'
              : 'Revert Swap'
            : isBn
            ? 'বিকল্প ব্যবহার করুন'
            : 'Apply Smart Swap'
        }
      </button>
    </div>`
    : '';

  detailSec.innerHTML = `
    <div class="nd-editorial-card p-5 md:p-8">
      <!-- Top Action Strip -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-outline-variant/60 no-print">
        <button id="backToOptionsBtn" type="button" class="nd-btn-secondary">
          <span>← ${escapeHtml(t(state.lang, 'backToOptionsBtn'))}</span>
        </button>

        <div class="flex flex-wrap items-center gap-2">
          <button id="toggleCookingModeBtn" type="button" class="nd-pill-btn ${
            state.cookingMode ? 'active' : ''
          }">
            <span>🍳 ${escapeHtml(
              state.cookingMode
                ? t(state.lang, 'exitCookingModeBtn')
                : t(state.lang, 'cookingModeBtn')
            )}</span>
          </button>

          <button id="openSharePosterBtn" type="button" class="nd-btn-primary">
            <span>🖼️ ${escapeHtml(t(state.lang, 'shareCardBtn'))}</span>
          </button>
        </div>
      </div>

      <!-- Hero Dish Banner -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8 hide-in-cook-mode">
        <div class="lg:col-span-5">
          <img
            src="${imgUrl}"
            alt="${fmt(recipe.title)}"
            class="w-full h-64 object-cover rounded-2xl border border-outline-variant shadow-sm"
            onerror="this.onerror=null;this.src='${buildEditorialFallbackSvg(recipe.title)}';"
          />
        </div>
        <div class="lg:col-span-7 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-xs font-bold">
              ${fmt(recipe.categoryTag)} • ${recipe.prepMinutes} Mins
            </span>
            <span class="px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-xs font-bold">
              ${fmt(recipe.glycemicTag)}
            </span>
          </div>
          <h2 class="font-headline-lg text-3xl md:text-4xl text-on-surface leading-tight">${fmt(
            recipe.title
          )}</h2>
          <p class="font-body-md text-base text-on-surface-variant">${fmt(recipe.subtitle)}</p>

          <div class="grid grid-cols-4 gap-2 pt-1">
            <div class="p-2.5 rounded-xl bg-surface-container-low text-center">
              <span class="block font-headline-sm text-xl text-primary">${recipe.calories}</span>
              <span class="block font-label-sm text-xs text-on-surface-variant">Kcal</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-low text-center">
              <span class="block font-headline-sm text-xl text-secondary">${recipe.proteinGrams}g</span>
              <span class="block font-label-sm text-xs text-on-surface-variant">${
                isBn ? 'প্রোটিন' : 'Protein'
              }</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-low text-center">
              <span class="block font-headline-sm text-xl text-tertiary">${recipe.carbsGrams}g</span>
              <span class="block font-label-sm text-xs text-on-surface-variant">${
                isBn ? 'শর্করা' : 'Carbs'
              }</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-low text-center">
              <span class="block font-headline-sm text-xl text-on-surface">${recipe.fatGrams}g</span>
              <span class="block font-label-sm text-xs text-on-surface-variant">${
                isBn ? 'ফ্যাট' : 'Fat'
              }</span>
            </div>
          </div>
        </div>
      </div>

      ${swapBoxHtml}

      <!-- Two-Column Mise-en-Place Ingredients + Step-by-Step Cooking Guide -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Ingredients & Unified Morning Basket Controls -->
        <div class="lg:col-span-6 hide-in-cook-mode">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 class="font-headline-md text-2xl text-on-surface">${escapeHtml(
              t(state.lang, 'ingredientsTitle')
            )}</h3>
            <button id="addAllMissingBasketBtn" type="button" class="nd-pill-btn active !text-xs">
              <span>🧺 ${
                isBn ? 'সব প্রয়োজনীয় উপকরণ ঝুড়িতে দিন' : 'Add All Missing to Basket'
              }</span>
            </button>
          </div>
          <p class="font-body-sm text-xs text-on-surface-variant mb-4">${escapeHtml(
            t(state.lang, 'ingredientsHint')
          )}</p>
          ${aislesHtml}

          <!-- Quick-Commerce Checkout Launch Bar -->
          <div class="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#fff0f0] to-[#ffe1e2] border border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span class="block font-headline-sm text-base text-primary">
                ${
                  isBn
                    ? `🧺 সকালের গ্রোসারি ঝুড়ি (${state.basketItems.length}টি উপকরণ)`
                    : `🧺 Morning Grocery Basket (${state.basketItems.length} items)`
                }
              </span>
              <span class="block font-body-sm text-xs text-on-surface-variant">
                ${
                  isBn
                    ? 'Blinkit, Zepto, Instamart বা BigBasket লোগো দেখতে ঝুড়ি খুলুন'
                    : 'Open basket to view Blinkit, Zepto, Instamart & BigBasket logos'
                }
              </span>
            </div>
            <button id="openBasketFromRecipeBtn" type="button" class="nd-btn-primary !min-h-[40px] !py-1.5 !px-4 !text-sm shrink-0">
              ${isBn ? 'ঝুড়ি ও অ্যাপ দেখুন ↗' : 'View Basket & Apps ↗'}
            </button>
          </div>
        </div>

        <!-- Right: Interactive Steps & 15-Min Countdown Timer -->
        <div class="${state.cookingMode ? 'lg:col-span-12' : 'lg:col-span-6'}">
          <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">⏱️</span>
              <div>
                <span class="block font-label-sm text-xs text-secondary uppercase">Kitchen Prep Timer</span>
                <span id="cookTimerDisplay" class="font-headline-md text-3xl text-primary tracking-wider">${formatSeconds(
                  state.timerSecondsLeft
                )}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button id="timerStartPauseBtn" type="button" class="nd-pill-btn active">
                ${escapeHtml(
                  state.timerRunning ? t(state.lang, 'timerPause') : t(state.lang, 'timerStart')
                )}
              </button>
              <button id="timerResetBtn" type="button" class="nd-pill-btn">
                ${escapeHtml(t(state.lang, 'timerReset'))}
              </button>
            </div>
          </div>

          <h3 class="font-headline-md text-2xl text-on-surface mb-3">${escapeHtml(
            t(state.lang, 'stepsTitle')
          )}</h3>
          <div class="space-y-3">${stepsHtml}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 8. Countdown Timer & Saved Favorites Helpers
 */
function formatSeconds(totalSec) {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function resetCookTimer(seconds = 900) {
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  state.timerSecondsLeft = seconds;
}

function toggleCookTimer() {
  if (state.timerRunning) {
    clearInterval(state.timerInterval);
    state.timerRunning = false;
  } else {
    state.timerRunning = true;
    state.timerInterval = setInterval(() => {
      if (state.timerSecondsLeft > 0) {
        state.timerSecondsLeft -= 1;
        const disp = document.getElementById('cookTimerDisplay');
        if (disp) disp.textContent = formatSeconds(state.timerSecondsLeft);
      } else {
        clearInterval(state.timerInterval);
        state.timerRunning = false;
        showToast(
          state.lang === 'bn'
            ? '⏰ আপনার জলখাবার প্রস্তুত!'
            : '⏰ Time is up! Your breakfast is ready!'
        );
      }
    }, 1000);
  }
  const btn = document.getElementById('timerStartPauseBtn');
  if (btn)
    btn.textContent = state.timerRunning ? t(state.lang, 'timerPause') : t(state.lang, 'timerStart');
}

function updateSavedCountBadge() {
  const count = FavoritesStore.getAll().length;
  const badge = document.getElementById('savedCountBadgeDesktop');
  if (badge) badge.textContent = String(count);
}

function openSavedFavoritesModal() {
  const modal = document.getElementById('savedModal');
  const listEl = document.getElementById('savedFavoritesList');
  if (!modal || !listEl) return;

  const saved = FavoritesStore.getAll();
  if (saved.length === 0) {
    listEl.innerHTML = `<p class="font-body-md text-sm text-on-surface-variant py-6 text-center">${
      state.lang === 'bn'
        ? 'এখনো কোনো রেসিপি সংরক্ষণ করা হয়নি।'
        : 'No saved morning recipes yet. Tap the heart icon on any card to save it here!'
    }</p>`;
  } else {
    listEl.innerHTML = saved
      .map(
        (item) => `
      <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant flex items-center justify-between gap-3">
        <div>
          <h4 class="font-headline-sm text-lg text-on-surface">${escapeHtml(item.title)}</h4>
          <span class="font-label-sm text-xs text-secondary">${item.prepMinutes}m • ${item.calories} kcal</span>
        </div>
        <button type="button" data-open-saved="${item.id}" class="nd-pill-btn active">Open</button>
      </div>`
      )
      .join('');
  }

  modal.classList.remove('hidden');
}

/**
 * 9. Event Wiring & Initialization
 */
function initApp() {
  const returningBanner = document.getElementById('returningUserBanner');
  if (returningBanner && state.hasSavedProfile) {
    returningBanner.classList.remove('hidden');
  }

  const byok = ByokStore.get();
  const providerSel = document.getElementById('byokProviderSelect');
  const keyInp = document.getElementById('byokKeyInput');
  if (providerSel) providerSel.value = byok.provider;
  if (keyInp) keyInp.value = byok.apiKey;

  applyLanguageBindings();
  loadDynamicHealthQuote(true);

  document.addEventListener('click', async (e) => {
    const target = e.target.closest('button, a[data-qc-launch], [data-step-idx]');
    if (!target) return;

    // Quote Refresh
    if (target.id === 'nextHealthQuoteBtn') {
      await loadDynamicHealthQuote(true);
      return;
    }

    // Language Switch
    if (target.id === 'langEnBtn') {
      state.lang = LanguageStore.set('en');
      applyLanguageBindings();
      return;
    }
    if (target.id === 'langBnBtn') {
      state.lang = LanguageStore.set('bn');
      applyLanguageBindings();
      return;
    }

    // BYOK Drawer
    if (target.id === 'toggleByokBtn') {
      document.getElementById('byokDrawer')?.classList.toggle('hidden');
      return;
    }
    if (target.id === 'saveByokBtn') {
      const prov = document.getElementById('byokProviderSelect')?.value || 'proxy';
      const key = document.getElementById('byokKeyInput')?.value || '';
      ByokStore.save(prov, key);
      document.getElementById('byokDrawer')?.classList.add('hidden');
      showToast('AI Engine preference saved locally.');
      return;
    }
    if (target.id === 'clearByokBtn') {
      ByokStore.clear();
      if (providerSel) providerSel.value = 'proxy';
      if (keyInp) keyInp.value = '';
      showToast('Reset to default studio proxy.');
      return;
    }

    // Reset Saved Profile
    if (target.id === 'resetSavedProfileBtn') {
      state.profile = ProfileStore.clear();
      state.hasSavedProfile = false;
      document.getElementById('returningUserBanner')?.classList.add('hidden');
      renderOnboardingPills();
      showToast('Saved preferences cleared.');
      return;
    }

    // Onboarding Pills
    if (target.dataset.age) {
      updateProfileSelection({ ageGroup: target.dataset.age });
      return;
    }
    if (target.dataset.gender) {
      updateProfileSelection({ gender: target.dataset.gender });
      return;
    }
    if (target.dataset.cuisine) {
      updateProfileSelection({ cuisine: target.dataset.cuisine });
      return;
    }
    if (target.dataset.diet) {
      updateProfileSelection({ dietType: target.dataset.diet });
      return;
    }
    if (target.dataset.prep) {
      updateProfileSelection({ maxPrepMinutes: Number(target.dataset.prep) });
      return;
    }
    if (target.dataset.condition) {
      updateProfileSelection({ healthCondition: target.dataset.condition });
      return;
    }

    // Generate 3 Options
    if (target.id === 'generateIdeasBtn') {
      await handleGenerateOptions(false);
      return;
    }
    if (target.id === 'refreshOptionsBtn') {
      await handleGenerateOptions(true);
      return;
    }

    // Bookmark Toggle
    if (target.dataset.bookmarkId) {
      const dish = state.options.find((o) => o.id === target.dataset.bookmarkId);
      if (dish) {
        FavoritesStore.toggle(dish);
        updateSavedCountBadge();
        renderOptionsGrid();
      }
      return;
    }

    // Select Recipe for Full View
    if (target.dataset.selectRecipe) {
      selectRecipeForCooking(target.dataset.selectRecipe);
      return;
    }

    // Morning Basket Controls
    if (target.dataset.basketIngIdx !== undefined && state.activeRecipe) {
      toggleBasketIngredient(state.activeRecipe, Number(target.dataset.basketIngIdx));
      return;
    }
    if (target.id === 'addAllMissingBasketBtn' && state.activeRecipe) {
      addAllMissingToBasket(state.activeRecipe);
      return;
    }
    if (
      target.id === 'openBasketBtnHeader' ||
      target.id === 'openBasketBtnMobile' ||
      target.id === 'openBasketFromRecipeBtn'
    ) {
      openBasketModal();
      return;
    }
    if (target.id === 'closeBasketModalBtn') {
      document.getElementById('basketModal')?.classList.add('hidden');
      return;
    }
    if (target.dataset.removeBasketIdx !== undefined) {
      state.basketItems.splice(Number(target.dataset.removeBasketIdx), 1);
      updateBasketCountBadge();
      openBasketModal();
      if (state.activeRecipe) renderActiveRecipeDetail();
      return;
    }
    if (target.id === 'copyBasketClipboardBtn') {
      const txt = formatBasketClipboardText();
      if (txt) {
        await navigator.clipboard?.writeText(txt);
        showToast(
          state.lang === 'bn'
            ? '📋 ঝুড়ির তালিকা কপি করা হয়েছে!'
            : '📋 Morning Basket copied to clipboard!'
        );
      }
      return;
    }
    if (target.dataset.qcLaunch) {
      const txt = formatBasketClipboardText();
      if (txt) {
        navigator.clipboard?.writeText(txt).catch(() => {});
        showToast(
          state.lang === 'bn'
            ? `📋 তালিকা কপি হয়েছে — ${target.dataset.qcLaunch} খুলছে...`
            : `📋 Basket copied — opening ${target.dataset.qcLaunch}...`
        );
      }
      return;
    }

    // Recipe Detail Controls
    if (target.id === 'backToOptionsBtn') {
      document.body.classList.remove('cooking-mode-active');
      state.cookingMode = false;
      document.getElementById('recipe-detail-section')?.classList.add('hidden');
      document.getElementById('options-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (target.id === 'toggleCookingModeBtn') {
      state.cookingMode = !state.cookingMode;
      document.body.classList.toggle('cooking-mode-active', state.cookingMode);
      renderActiveRecipeDetail();
      return;
    }
    if (target.id === 'togglePantrySwapBtn') {
      state.swapApplied = !state.swapApplied;
      renderActiveRecipeDetail();
      return;
    }

    // Cook Timer Controls
    if (target.id === 'timerStartPauseBtn') {
      toggleCookTimer();
      return;
    }
    if (target.id === 'timerResetBtn' && state.activeRecipe) {
      resetCookTimer((state.activeRecipe.prepMinutes || 15) * 60);
      renderActiveRecipeDetail();
      return;
    }

    // Highlight Step in Cook Mode
    if (target.dataset.stepIdx !== undefined) {
      state.activeStepIndex = Number(target.dataset.stepIdx);
      renderActiveRecipeDetail();
      return;
    }

    // Shareable Poster Modal
    if (target.id === 'openSharePosterBtn' && state.activeRecipe) {
      const mount = document.getElementById('sharePosterMount');
      const media = state.resolvedImages.get(state.activeRecipe.id);
      renderSharePoster(mount, state.activeRecipe, media?.url, state.lang);
      document.getElementById('shareModal')?.classList.remove('hidden');
      return;
    }
    if (target.id === 'closeShareModalBtn') {
      document.getElementById('shareModal')?.classList.add('hidden');
      return;
    }
    if (target.id === 'printRecipeBtn') {
      window.print();
      return;
    }
    if (target.id === 'downloadPngBtn' && state.activeRecipe) {
      await downloadPosterAsPng(state.activeRecipe.title);
      return;
    }

    // Saved Drawer Modal
    if (target.id === 'openSavedDrawerBtnDesktop' || target.id === 'openSavedDrawerBtnMobile') {
      openSavedFavoritesModal();
      return;
    }
    if (target.id === 'closeSavedModalBtn') {
      document.getElementById('savedModal')?.classList.add('hidden');
      return;
    }
    if (target.dataset.openSaved) {
      document.getElementById('savedModal')?.classList.add('hidden');
      selectRecipeForCooking(target.dataset.openSaved);
      return;
    }
  });

  // Ingredient Pantry Checkbox Change Listener
  document.addEventListener('change', (e) => {
    const idxStr = e.target?.dataset?.toggleIng;
    if (idxStr !== undefined) {
      const idx = Number(idxStr);
      if (e.target.checked) {
        state.checkedIngredients.add(idx);
      } else {
        state.checkedIngredients.delete(idx);
      }
      renderActiveRecipeDetail();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);