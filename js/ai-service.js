/**
 * NutriDawn — AI Breakfast Generation Service
 * Supports: (1) Cloudflare Worker Proxy, (2) Direct BYOK Groq/Gemini, (3) Offline Emergency Fallback
 * Includes Weekend / No-Time-Bound Traditional Classics, WHO/IMA/ICMR-NIN clinical alignment,
 * and Bengali Unicode NFC sanitization.
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

import {
  APP_CONFIG,
  AGE_GROUPS,
  GENDERS,
  HEALTH_CONDITIONS,
  CUISINES,
  DIET_TYPES
} from './config.js';
import { sanitizeBengali } from './i18n-bn.js';
import { ByokStore } from './storage-service.js';

const sessionResultCache = new Map();

function sanitizeRecipeObject(recipe, lang) {
  if (lang !== 'bn') return recipe;
  return {
    ...recipe,
    categoryTag: sanitizeBengali(recipe.categoryTag || ''),
    title: sanitizeBengali(recipe.title || ''),
    subtitle: sanitizeBengali(recipe.subtitle || ''),
    glycemicTag: sanitizeBengali(recipe.glycemicTag || ''),
    healthRationale: sanitizeBengali(recipe.healthRationale || ''),
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((ing) => ({
          ...ing,
          quantity: sanitizeBengali(ing.quantity || ''),
          displayName: sanitizeBengali(ing.displayName || ''),
          aisle: sanitizeBengali(ing.aisle || '')
        }))
      : [],
    pantrySwap: recipe.pantrySwap
      ? {
          original: sanitizeBengali(recipe.pantrySwap.original || ''),
          replacement: sanitizeBengali(recipe.pantrySwap.replacement || ''),
          impactNote: sanitizeBengali(recipe.pantrySwap.impactNote || '')
        }
      : null,
    steps: Array.isArray(recipe.steps) ? recipe.steps.map((s) => sanitizeBengali(s)) : []
  };
}

function buildPromptPayload(profile, language) {
  const ageObj = AGE_GROUPS.find((a) => a.id === profile.ageGroup) || AGE_GROUPS[2];
  const genderObj = GENDERS.find((g) => g.id === profile.gender) || GENDERS[2];
  const condObj = HEALTH_CONDITIONS.find((c) => c.id === profile.healthCondition) || HEALTH_CONDITIONS[0];
  const cuisineObj = CUISINES.find((c) => c.id === profile.cuisine) || CUISINES[0];
  const dietObj = DIET_TYPES.find((d) => d.id === profile.dietType) || DIET_TYPES[0];
  const parsedPrep = Number(profile.maxPrepMinutes);
  const isNoTimeBound = parsedPrep === 0;

  return {
    language,
    ageLabel: ageObj.labelEn,
    genderLabel: genderObj.labelEn,
    baselineNutrients: ageObj.baselineNutrientsEn,
    micronutrientFocus: genderObj.micronutrientFocusEn,
    cuisineLabel: cuisineObj.labelEn,
    dietLabel: dietObj.labelEn,
    conditionId: condObj.id,
    maxPrepMinutes: isNoTimeBound ? 0 : parsedPrep || 15,
    isNoTimeBound,
    conditionLabel: condObj.labelEn,
    clinicalRule: `${condObj.clinicalPromptRule} Texture note: ${ageObj.textureNote}. Align with WHO, IMA, and ICMR-NIN dietary guidelines.`,
    strictExclusions: condObj.strictExclusions || []
  };
}

function buildInlineSystemPrompt(p, varietySeed = '') {
  const langRule =
    p.language === 'bn'
      ? 'Output all user-facing display fields in natural, grammatically accurate Bengali Unicode script (বাংলা). Keep englishSearchQuery and photoKeywords strictly in English.'
      : 'Output all user-facing display fields in clear, warm, practical English.';

  const exclusions =
    p.strictExclusions.length > 0
      ? `STRICTLY FORBIDDEN INGREDIENTS: ${p.strictExclusions.join(', ')}.`
      : 'Use wholesome everyday household ingredients.';

  let timeAndStyleRule = `Each recipe MUST be ready in <= ${p.maxPrepMinutes} minutes.`;
  if (p.isNoTimeBound) {
    if (p.conditionId === 'none') {
      timeAndStyleRule = `NO TIME BOUND (Weekend / Leisurely Morning, 20–40 mins allowed): Include beloved traditional rolled, stuffed, or slow-cooked breakfast classics matching the chosen cuisine! For Bengali Home-Style, feature classics like Whole-Wheat Atta Luchi with Chholar Dal or Sada Aloor Torkari, Koraishutir Kochuri, or Radhaballabhi (made with wholesome ingredients and balanced sides like curd or salad). For Pan-Indian, feature classics like Stuffed Aloo Paratha with Curd, Bedmi Puri-Sabzi, or Masala Dosa.`;
    } else {
      timeAndStyleRule = `NO TIME BOUND (Weekend / Leisurely Morning, 20–40 mins allowed): Include wholesome slow-cooked or stuffed traditional breakfast dishes (such as Stuffed Oats/Multigrain Paratha, Steamed Idli-Sambar, or Vegetable Daliya Khichdi) while strictly honoring all forbidden ingredient exclusions for ${p.conditionLabel}.`;
    }
  }

  return `You are NutriDawn's Clinical Culinary Architect. Generate 3 distinct, authentic breakfast options aligned with WHO, IMA, and ICMR-NIN nutritional guidelines.
Profile: ${p.ageLabel}, ${p.genderLabel} (${p.micronutrientFocus}), Baseline: ${p.baselineNutrients}, Cuisine: ${p.cuisineLabel}, Diet: ${p.dietLabel}, Care Mode: ${p.conditionLabel} (${p.clinicalRule}).
${timeAndStyleRule}
${exclusions}
${langRule}
${varietySeed}
Return ONLY valid JSON:
{"options":[{"id":"opt-1","categoryTag":"Bengali Heritage","title":"Dish Name","subtitle":"1-line summary","prepMinutes":25,"calories":340,"proteinGrams":14,"carbsGrams":42,"fatGrams":11,"glycemicTag":"Balanced Energy","healthRationale":"Why this fits","photoKeywords":"3 English keywords","ingredients":[{"quantity":"1 cup","displayName":"Whole Wheat Atta","englishSearchQuery":"whole wheat atta","aisle":"Grains & Flours"}],"pantrySwap":{"original":"Whole Wheat Atta","replacement":"Multigrain Atta","impactNote":"Higher fiber"},"steps":["Step 1","Step 2","Step 3","Step 4"]}]}`;
}

function parseJsonPayload(rawText) {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}

async function fetchViaCloudflareWorker(payload, forceRefresh = false) {
  const varietySeed = forceRefresh
    ? `Request Variation #${Date.now() % 10000}: Offer 3 completely fresh, different recipes from typical defaults.`
    : '';
  const systemPrompt = buildInlineSystemPrompt(payload, varietySeed);

  const res = await fetch(APP_CONFIG.api.workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: APP_CONFIG.api.defaultGroqModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate 3 tailored ${payload.cuisineLabel} (${payload.dietLabel}) breakfast options in valid JSON.`
        }
      ],
      temperature: forceRefresh ? 0.85 : 0.65,
      max_tokens: 2600
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Worker HTTP ${res.status}: ${errText.slice(0, 160)}`);
  }

  const data = await res.json();
  if (Array.isArray(data?.options)) {
    return data;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(data?.error?.message || data?.error || 'Empty completion from Worker');
  }

  return parseJsonPayload(content);
}

async function fetchDirectByok(byok, payload, forceRefresh = false) {
  const varietySeed = forceRefresh
    ? `Request Variation #${Date.now() % 10000}: Offer 3 completely fresh, different recipes.`
    : '';
  const prompt = buildInlineSystemPrompt(payload, varietySeed);

  if (byok.provider === 'groq') {
    const res = await fetch('[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${byok.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: APP_CONFIG.api.defaultGroqModel,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Generate 3 tailored breakfast options JSON.' }
        ],
        temperature: forceRefresh ? 0.85 : 0.65,
        max_tokens: 2600,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) throw new Error(`Groq BYOK HTTP ${res.status}`);
    const data = await res.json();
    return parseJsonPayload(data.choices[0].message.content);
  }

  if (byok.provider === 'gemini') {
    const url = `[https://generativelanguage.googleapis.com/v1beta/models/$](https://generativelanguage.googleapis.com/v1beta/models/$){APP_CONFIG.api.fallbackGeminiModel}:generateContent?key=${encodeURIComponent(byok.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: forceRefresh ? 0.85 : 0.65,
          maxOutputTokens: 2600,
          responseMimeType: 'application/json'
        }
      })
    });
    if (!res.ok) throw new Error(`Gemini BYOK HTTP ${res.status}`);
    const data = await res.json();
    return parseJsonPayload(data.candidates[0].content.parts[0].text);
  }

  throw new Error('Invalid BYOK provider');
}

/**
 * Offline / Network Outage Emergency Recipes (Shown ONLY when internet or Worker is unreachable)
 */
function getCuratedFallbackOptions(profile, lang) {
  const isBn = lang === 'bn';
  const rawOptions = [
    {
      id: 'curated-chilla',
      categoryTag: isBn ? 'বাঙালি ঘরোয়া পুষ্টি' : 'Bengali Heritage',
      title: isBn ? 'ওটস ও মুগ ডালের চিলা সাথে পুদিনা চাটনি' : 'Oats Moong Dal Chilla & Mint Chutney',
      subtitle: isBn
        ? 'ভিজানো মুগ ডাল ও ওটস দিয়ে তৈরি হালকা, মচমচে ও উচ্চ প্রোটিনযুক্ত সকালের জলখাবার।'
        : 'Light, crisp split yellow moong and rolled oats savory pancake served with cooling mint dip.',
      prepMinutes: 12,
      calories: 280,
      proteinGrams: 18,
      carbsGrams: 32,
      fatGrams: 7,
      glycemicTag: isBn ? 'লো-জিআই ও প্রোটিন সমৃদ্ধ' : 'Low-GI • 18g Protein',
      healthRationale: isBn
        ? 'ধীরে হজম হওয়া জটিল শর্করা ও উদ্ভিজ্জ প্রোটিন রক্তে শর্করার মাত্রা স্থিতিশীল রাখে এবং দীর্ঘক্ষণ শক্তি জোগায়।'
        : 'Slow-digesting beta-glucans from oats paired with lean moong protein prevent morning glucose spikes and sustain focus.',
      photoKeywords: 'moong dal chilla indian pancake mint chutney',
      ingredients: [
        {
          quantity: isBn ? '১/২ কাপ' : '1/2 cup',
          displayName: isBn ? 'ভিজানো হলুদ মুগ ডাল' : 'Soaked Yellow Moong Dal',
          englishSearchQuery: 'yellow moong dal',
          aisle: isBn ? 'ডাল ও শস্য' : 'Pulses & Grains'
        },
        {
          quantity: isBn ? '১/৪ কাপ' : '1/4 cup',
          displayName: isBn ? 'রোল্ড ওটস গুঁড়ো' : 'Rolled Oats',
          englishSearchQuery: 'rolled oats',
          aisle: isBn ? 'ডাল ও শস্য' : 'Pulses & Grains'
        },
        {
          quantity: isBn ? '১ চা চামচ' : '1 tsp',
          displayName: isBn ? 'কোরানো আদা ও কাঁচা লঙ্কা' : 'Grated Ginger & Green Chili',
          englishSearchQuery: 'fresh ginger',
          aisle: isBn ? 'তাজা সবজি' : 'Fresh Produce'
        },
        {
          quantity: isBn ? '১ মুঠো' : '1 handful',
          displayName: isBn ? 'তাজা পুদিনা ও ধনে পাতা' : 'Fresh Mint & Coriander Leaves',
          englishSearchQuery: 'fresh mint leaves',
          aisle: isBn ? 'তাজা সবজি' : 'Fresh Produce'
        },
        {
          quantity: isBn ? '১ চা চামচ' : '1 tsp',
          displayName: isBn ? 'সাদা তেল বা ঘি' : 'Cold-Pressed Oil or Ghee',
          englishSearchQuery: 'cow ghee',
          aisle: isBn ? 'তেল ও মসলা' : 'Oils & Spices'
        }
      ],
      pantrySwap: {
        original: isBn ? 'ভিজানো মুগ ডাল' : 'Soaked Moong Dal',
        replacement: isBn ? 'বেসন ও সুজির মিশ্রণ' : 'Besan + Sooji Mix',
        impactNote: isBn ? 'একইরকম মচমচে ভাব ও ১৮ গ্রাম প্রোটিন বজায় থাকে' : 'Retains crisp texture & 18g protein with zero soaking'
      },
      steps: isBn
        ? [
            'ভিজানো মুগ ডাল, ওটস, সামান্য আদা ও অল্প জল দিয়ে মসৃণ ব্যাটার তৈরি করে নিন।',
            'ব্যাটারে এক চিমটি হলুদ, জিরে গুঁড়ো ও পরিমাণমতো লবণ মিশিয়ে ২ মিনিট রাখুন।',
            'গরম নন-স্টিক তাওয়ায় সামান্য তেল ব্রাশ করে হাতা দিয়ে গোল করে ব্যাটার ছড়িয়ে দিন।',
            'মাঝারি আঁচে দু’পিঠ সোনালি করে ভেজে তাজা পুদিনা চাটনির সাথে পরিবেশন করুন।'
          ]
        : [
            'Blend soaked yellow moong dal, rolled oats, grated ginger, and 3 tbsp water into a smooth pourable batter.',
            'Stir in a pinch of turmeric, roasted cumin powder, and light salt.',
            'Lightly brush a warm non-stick skillet with oil and spread a ladleful of batter into a thin circle.',
            'Cook 2 minutes per side until golden crisp and serve warm with fresh mint chutney.'
          ]
    },
    {
      id: 'curated-parfait',
      categoryTag: isBn ? 'রান্না ছাড়াই ৫ মিনিটে' : 'No-Cook Continental',
      title: isBn ? 'চিয়া বীজ, দই ও ফলের মর্নিং পারফে' : 'Warm Chia, Hung Curd & Berry Parfait',
      subtitle: isBn
        ? 'ওমেগা-৩ ও প্রোবায়োটিক সমৃদ্ধ ৫ মিনিটের ঠান্ডা-উষ্ণ পুষ্টিকর জলখাবার।'
        : 'Fiber-dense chia pudding layered with probiotic hung curd, seasonal berries, and toasted walnuts.',
      prepMinutes: 5,
      calories: 310,
      proteinGrams: 14,
      carbsGrams: 29,
      fatGrams: 12,
      glycemicTag: isBn ? 'ওমেগা-৩ ও ফাইবার সমৃদ্ধ' : 'Omega-3 • 11g Fiber',
      healthRationale: isBn
        ? 'হজমশক্তি ভালো রাখে, অ্যাসিডিটি কমায় এবং সকালের মস্তিষ্কের কর্মক্ষমতা বাড়াতে সাহায্য করে।'
        : 'Live probiotic cultures soothe morning acidity while omega-3 fatty acids and soluble fiber fuel sustained brain energy.',
      photoKeywords: 'chia seed pudding yogurt berries glass jar breakfast',
      ingredients: [
        {
          quantity: isBn ? '৩ টেবিল চামচ' : '3 tbsp',
          displayName: isBn ? 'চিয়া বীজ' : 'Chia Seeds',
          englishSearchQuery: 'chia seeds',
          aisle: isBn ? 'বীজ ও বাদাম' : 'Seeds & Nuts'
        },
        {
          quantity: isBn ? '১/২ কাপ' : '1/2 cup',
          displayName: isBn ? 'জল ঝরানো টক দই' : 'Plain Hung Curd / Greek Yogurt',
          englishSearchQuery: 'greek yogurt plain',
          aisle: isBn ? 'দুগ্ধজাত খাবার' : 'Dairy & Chilled'
        },
        {
          quantity: isBn ? '১/২ কাপ' : '1/2 cup',
          displayName: isBn ? 'মৌসুমি ফল বা বেরি কুচি' : 'Seasonal Berries or Sliced Apple',
          englishSearchQuery: 'fresh blueberries',
          aisle: isBn ? 'তাজা ফল' : 'Fresh Produce'
        },
        {
          quantity: isBn ? '৪-৫টি' : '4–5 halves',
          displayName: isBn ? 'আখরোট বা কাঠবাদাম কুচি' : 'Toasted Walnuts or Almonds',
          englishSearchQuery: 'walnut kernels',
          aisle: isBn ? 'বীজ ও বাদাম' : 'Seeds & Nuts'
        }
      ],
      pantrySwap: {
        original: isBn ? 'চিয়া বীজ' : 'Chia Seeds',
        replacement: isBn ? 'হালকা ভাজা তিসি বীজ (Flax)' : 'Roasted Flax Seeds (তিসি)',
        impactNote: isBn ? 'সমান ওমেগা-৩ ফ্যাটি অ্যাসিড ও ফাইবার পাওয়া যায়' : 'Identical omega-3 & lignan profile at lower cost'
      },
      steps: isBn
        ? [
            'একটি কাঁচের বাটিতে চিয়া বীজ ও সামান্য উষ্ণ দুধ বা জল মিশিয়ে ৩-৪ মিনিট ভিজতে দিন।',
            'একটি গ্লাসে প্রথমে ভেজানো চিয়া বীজের স্তর ও তার ওপর জল ঝরানো টক দই দিন।',
            'ওপরে তাজা ফলের টুকরো, এক চিমটি দারুচিনি গুঁড়ো ও আখরোট ছড়িয়ে দিন।',
            'কোনো রান্না ছাড়াই তৎক্ষণাৎ পরিবেশন করুন।'
          ]
        : [
            'Stir chia seeds with 1/2 cup warm milk or water and let bloom for 3–4 minutes until gel-like.',
            'Layer the bloomed chia pudding and creamy hung curd in a glass or breakfast bowl.',
            'Top with sliced seasonal fruits, a pinch of cinnamon, and crushed walnuts.',
            'Serve immediately with zero stovetop cooking required.'
          ]
    },
    {
      id: 'curated-poha',
      categoryTag: isBn ? 'ভারতীয় ঘরোয়া জলখাবার' : 'Warm Indian Comfort',
      title: isBn ? 'অঙ্কুরিত মুগ ও মেথি শাকের মশলা চিঁড়ে' : 'Masala Sprouted Methi Red Poha',
      subtitle: isBn
        ? 'আয়রন সমৃদ্ধ লাল চিঁড়ে, অঙ্কুরিত মুগ ও তাজা মেথি পাতায় তৈরি ঝরঝরে ও হালকা প্রাতরাশ।'
        : 'Iron-rich flattened red rice tempered with fresh fenugreek leaves, sprouted moong, peanuts, and lemon.',
      prepMinutes: 10,
      calories: 290,
      proteinGrams: 12,
      carbsGrams: 38,
      fatGrams: 8,
      glycemicTag: isBn ? 'আয়রন সমৃদ্ধ ও হৃদবান্ধব' : 'Iron-Rich • Heart-Smart',
      healthRationale: isBn
        ? 'মেথি পাতা ও অঙ্কুরিত মুগ রক্তে শর্করা নিয়ন্ত্রণে সাহায্য করে এবং লেবুর রস আয়রন শোষণে সহায়তা করে।'
        : 'Fenugreek soluble fiber slows glucose absorption while fresh lemon vitamin C maximizes plant-iron bioavailability.',
      photoKeywords: 'indian poha flattened rice peanuts curry leaves bowl',
      ingredients: [
        {
          quantity: isBn ? '১ কাপ' : '1 cup',
          displayName: isBn ? 'মোটা লাল বা সাদা চিঁড়ে' : 'Thick Red or White Poha',
          englishSearchQuery: 'red poha flattened rice',
          aisle: isBn ? 'ডাল ও শস্য' : 'Pulses & Grains'
        },
        {
          quantity: isBn ? '১/৩ কাপ' : '1/3 cup',
          displayName: isBn ? 'অঙ্কুরিত সবুজ মুগ' : 'Steamed Moong Sprouts',
          englishSearchQuery: 'green moong sprouts',
          aisle: isBn ? 'তাজা সবজি' : 'Fresh Produce'
        },
        {
          quantity: isBn ? '১ মুঠো' : '1 handful',
          displayName: isBn ? 'কুচানো তাজা মেথি বা পালং শাক' : 'Chopped Fresh Methi or Spinach',
          englishSearchQuery: 'fresh methi leaves',
          aisle: isBn ? 'তাজা সবজি' : 'Fresh Produce'
        },
        {
          quantity: isBn ? '২ টেবিল চামচ' : '2 tbsp',
          displayName: isBn ? 'ভাজা চিনাবাদাম' : 'Roasted Peanuts',
          englishSearchQuery: 'raw peanuts',
          aisle: isBn ? 'বীজ ও বাদাম' : 'Seeds & Nuts'
        },
        {
          quantity: isBn ? '১/২টি' : '1/2 lemon',
          displayName: isBn ? 'পাতিলেবুর রস ও কারিপাতা' : 'Fresh Lemon & Curry Leaves',
          englishSearchQuery: 'fresh lemon',
          aisle: isBn ? 'তাজা ফল' : 'Fresh Produce'
        }
      ],
      pantrySwap: {
        original: isBn ? 'চিঁড়ে (Poha)' : 'Flattened Rice (Poha)',
        replacement: isBn ? 'রোল্ড ওটস (Savory Oats)' : 'Rolled Oats',
        impactNote: isBn ? 'আরও বেশি ফাইবার ও কম গ্লাইসেমিক লোড পাওয়া যায়' : 'Higher soluble fiber and lower glycemic load'
      },
      steps: isBn
        ? [
            'চিঁড়ে ভালো করে ধুয়ে জল ঝরিয়ে ৫ মিনিট নরম হতে দিন।',
            'কড়াইতে ১ চা চামচ তেলে সর্ষে, কারিপাতা, মেথি শাক ও অঙ্কুরিত মুগ ২ মিনিট নেড়ে নিন।',
            'হলুদ ও নরম চিঁড়ে মিশিয়ে হালকা আঁচে আরও ২ মিনিট নাড়াচাড়া করুন।',
            'আঁচ বন্ধ করে ওপরে ভাজা চিনাবাদাম ও পাতিলেবুর রস ছড়িয়ে গরম গরম পরিবেশন করুন।'
          ]
        : [
            'Rinse thick poha in a strainer for 10 seconds and let soften for 3 minutes.',
            'Temper mustard seeds, curry leaves, chopped methi leaves, and moong sprouts in 1 tsp oil for 2 minutes.',
            'Fold in turmeric, light salt, and softened poha; toss gently for 2 minutes on low heat.',
            'Turn off heat, garnish with roasted peanuts and fresh lemon juice, and serve warm.'
          ]
    }
  ];

  return rawOptions.map((opt) => sanitizeRecipeObject(opt, lang));
}

/**
 * Main entry point to fetch 3 personalized breakfast options.
 */
export async function generateBreakfastOptions(profile, language = 'en', forceRefresh = false) {
  const payload = buildPromptPayload(profile, language);
  const cacheKey = JSON.stringify(payload);

  if (!forceRefresh && sessionResultCache.has(cacheKey)) {
    return {
      options: sessionResultCache.get(cacheKey),
      source: 'session-cache'
    };
  }

  const byok = ByokStore.get();

  try {
    let rawResponse = null;
    let source = 'worker-proxy';

    if (byok.provider !== 'proxy' && byok.apiKey) {
      rawResponse = await fetchDirectByok(byok, payload, forceRefresh);
      source = `byok-${byok.provider}`;
    } else if (
      APP_CONFIG.api.workerUrl &&
      !APP_CONFIG.api.workerUrl.includes('your-subdomain')
    ) {
      rawResponse = await fetchViaCloudflareWorker(payload, forceRefresh);
      source = 'worker-proxy';
    } else {
      const fallback = getCuratedFallbackOptions(profile, language);
      return { options: fallback, source: 'curated-fallback' };
    }

    if (rawResponse && Array.isArray(rawResponse.options) && rawResponse.options.length > 0) {
      const sanitized = rawResponse.options
        .slice(0, 3)
        .map((opt, idx) =>
          sanitizeRecipeObject(
            { id: `${opt.id || `opt-${idx + 1}`}-${Date.now()}-${idx}`, ...opt },
            language
          )
        );
      sessionResultCache.set(cacheKey, sanitized);
      return { options: sanitized, source };
    }

    throw new Error('Malformed AI options payload');
  } catch (err) {
    console.warn('[NutriDawn Offline/Fallback Activated]:', err.message);
    const fallback = getCuratedFallbackOptions(profile, language);
    return { options: fallback, source: 'curated-fallback' };
  }
}