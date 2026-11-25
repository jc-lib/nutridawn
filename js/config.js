/**
 * NutriDawn — Core Configuration, Nutrition Matrices & Quick-Commerce Rules
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

export const APP_CONFIG = Object.freeze({
  appName: 'NutriDawn',
  taglineEn: 'Smart, Simple Breakfasts Tailored to Your Health.',
  taglineBn: 'আপনার স্বাস্থ্যের উপযোগী স্মার্ট ও সহজ সকালের জলখাবার।',
  attribution: 'Designed & Created by: Dr. Joydip Chandra, BRSC',
  storageKeys: {
    userProfile: 'nutridawn_profile_v1',
    byokConfig: 'nutridawn_byok_v1',
    savedFavorites: 'nutridawn_favorites_v1',
    language: 'nutridawn_lang_v1'
  },
  api: {
    workerUrl: 'https://nutridawn-api.clbrsnc.workers.dev',
    defaultGroqModel: 'openai/gpt-oss-120b',
    fallbackGeminiModel: 'gemini-2.5-flash',
    maxPrepMinutes: 15
  }
});

/**
 * 1. Life Stages (Age Groups) with Baseline Nutritional Priorities
 */
export const AGE_GROUPS = Object.freeze([
  {
    id: 'kids',
    icon: '🧸',
    ageRange: '5–12 yrs',
    labelEn: 'Kids (5–12)',
    labelBn: 'শিশু (৫–১২ বছর)',
    baselineNutrientsEn: 'Calcium, Iron, Brain-Healthy Fats & Complete Protein for steady growth and school focus',
    baselineNutrientsBn: 'বৃদ্ধি ও পড়াশোনার মনোযোগের জন্য ক্যালসিয়াম, আয়রন ও সুষম প্রোটিন',
    textureNote: 'Kid-friendly, mild spices, bite-sized and colorful presentation'
  },
  {
    id: 'teen',
    icon: '🎒',
    ageRange: '13–19 yrs',
    labelEn: 'Teen (13–19)',
    labelBn: 'কিশোর-কিশোরী (১৩–১৯ বছর)',
    baselineNutrientsEn: 'High Protein, Iron, Zinc, Calcium & Complex Carbs for active growth spurts and stamina',
    baselineNutrientsBn: 'দ্রুত শারীরিক গঠন ও শক্তির জন্য উচ্চ প্রোটিন, আয়রন, জিঙ্ক ও জটিল শর্করা',
    textureNote: 'Filling, energizing, easy to eat before classes'
  },
  {
    id: 'young_adult',
    icon: '⚡',
    ageRange: '20–35 yrs',
    labelEn: 'Young Adult (20–35)',
    labelBn: 'তরুণ প্রাপ্তবয়স্ক (২০–৩৫ বছর)',
    baselineNutrientsEn: 'Sustained-release Complex Carbs, Lean Protein, B-Vitamins & Magnesium for busy workdays',
    baselineNutrientsBn: 'সারাদিনের কর্মক্ষমতার জন্য প্রোটিন, ভিটামিন বি-কমপ্লেক্স ও ম্যাগনেসিয়াম',
    textureNote: 'Quick-prep, portable or desk-friendly wholesome meals'
  },
  {
    id: 'adult',
    icon: '🌿',
    ageRange: '36–59 yrs',
    labelEn: 'Adult (36–59)',
    labelBn: 'প্রাপ্তবয়স্ক (৩৬–৫৯ বছর)',
    baselineNutrientsEn: 'Soluble Dietary Fiber, Lean Protein, Potassium & Antioxidants for metabolic and heart wellness',
    baselineNutrientsBn: 'বিপাকক্রিয়া ও হৃদযন্ত্রের সুস্থতার জন্য ফাইবার, প্রোটিন ও অ্যান্টিঅক্সিডেন্ট',
    textureNote: 'Balanced glycemic load, moderate healthy fats'
  },
  {
    id: 'senior',
    icon: '🤍',
    ageRange: '60+ yrs',
    labelEn: 'Senior (60+)',
    labelBn: 'প্রবীণ (৬০+ বছর)',
    baselineNutrientsEn: 'Soft-textured Easily Digestible Protein, Vitamin D, Calcium, Potassium & Gut-friendly Fiber',
    baselineNutrientsBn: 'সহজপাচ্য নরম প্রোটিন, ক্যালসিয়াম, পটাশিয়াম ও হজমসহায়ক ফাইবার',
    textureNote: 'Soft, easy-to-chew, gentle on digestion, low oil'
  }
]);

/**
 * 2. Gender-Specific Micronutrient Modifiers
 */
export const GENDERS = Object.freeze([
  {
    id: 'female',
    labelEn: 'Female',
    labelBn: 'মহিলা',
    micronutrientFocusEn: 'Extra emphasis on Dietary Iron, Folate, Calcium & Vitamin B12',
    micronutrientFocusBn: 'আয়রন, ফলেট, ক্যালসিয়াম ও ভিটামিন বি-১২ সমৃদ্ধ উপাদান'
  },
  {
    id: 'male',
    labelEn: 'Male',
    labelBn: 'পুরুষ',
    micronutrientFocusEn: 'Extra emphasis on Lean Protein, Zinc, Magnesium & Heart-Healthy Fiber',
    micronutrientFocusBn: 'চর্বিহীন প্রোটিন, জিঙ্ক, ম্যাগনেসিয়াম ও হৃদবান্ধব ফাইবার'
  },
  {
    id: 'neutral',
    labelEn: 'Prefer not to say',
    labelBn: 'উল্লেখ করতে অনিচ্ছুক',
    micronutrientFocusEn: 'Balanced Micronutrients, Complete Plant/Animal Protein & Dietary Fiber',
    micronutrientFocusBn: 'সুষম মাইক্রোনিউট্রিয়েন্ট, প্রোটিন ও ফাইবার'
  }
]);

/**
 * 3. Gentle Wellness & Health Care Modes (Optional Overrides)
 */
export const HEALTH_CONDITIONS = Object.freeze([
  {
    id: 'none',
    badgeColor: 'mint',
    labelEn: 'Just Everyday Wellness',
    labelBn: 'সাধারণ দৈনন্দিন সুস্বাস্থ্য',
    clinicalPromptRule: 'Apply standard age- and gender-specific baseline nutrition. Focus on balanced macros and whole ingredients.',
    strictExclusions: []
  },
  {
    id: 'diabetes',
    badgeColor: 'sky',
    labelEn: 'Gentle on Blood Sugar (Low-GI)',
    labelBn: 'রক্তে শর্করা নিয়ন্ত্রণ (লো-জিআই)',
    clinicalPromptRule: 'Strictly Low Glycemic Index (GI < 55), high soluble fiber, paired with protein/healthy fats to prevent glucose spikes.',
    strictExclusions: ['refined sugar', 'jaggery', 'honey', 'white bread', 'maida', 'sweetened syrups', 'white rice flakes in excess']
  },
  {
    id: 'hypertension',
    badgeColor: 'turquoise',
    labelEn: 'Heart & Blood Pressure Care (Low-Salt)',
    labelBn: 'হৃদযন্ত্র ও রক্তচাপ যত্ন (কম লবণ)',
    clinicalPromptRule: 'DASH-inspired low-sodium preparation, rich in potassium and magnesium. Use herbs, lemon, and spices instead of excess salt.',
    strictExclusions: ['pickles', 'papad', 'processed cheese', 'salted butter', 'soy sauce', 'baking soda', 'table salt > 1/4 tsp']
  },
  {
    id: 'acidity',
    badgeColor: 'pink',
    labelEn: 'Light & Easy on Digestion',
    labelBn: 'সহজপাচ্য ও অ্যাসিডিটি-মুক্ত',
    clinicalPromptRule: 'Alkaline-leaning, soothing, non-greasy, easily digestible ingredients gentle on sensitive stomachs.',
    strictExclusions: ['deep-fried items', 'red chili powder', 'raw onion', 'excess garlic', 'vinegar', 'citrus concentrate', 'heavy cream']
  },
  {
    id: 'hormonal',
    badgeColor: 'mint',
    labelEn: 'Hormonal & Thyroid Balance',
    labelBn: 'হরমোন ও থাইরয়েড ভারসাম্য',
    clinicalPromptRule: 'Anti-inflammatory whole foods rich in selenium, zinc, omega-3s, and high fiber; avoid ultra-processed carbs.',
    strictExclusions: ['refined flour (maida)', 'sugary spreads', 'deep-fried snacks', 'raw cruciferous vegetables in large amounts']
  },
  {
    id: 'weight_energy',
    badgeColor: 'sky',
    labelEn: 'Weight & Steady Energy Balance',
    labelBn: 'ওজন ও দীর্ঘস্থায়ী শক্তি নিয়ন্ত্রণ',
    clinicalPromptRule: 'High satiety-to-calorie ratio (280–380 kcal), high protein and fiber, minimal added oils.',
    strictExclusions: ['heavy cream', 'deep frying', 'sugar', 'mayonnaise', 'butter > 1 tsp']
  }
]);

/**
 * 4. Cuisine, Diet & Prep Time Options
 */
export const CUISINES = Object.freeze([
  { id: 'bengali', labelEn: 'Bengali Home-Style', labelBn: 'বাঙালি ঘরোয়া খাবার' },
  { id: 'indian', labelEn: 'Pan-Indian Quick', labelBn: 'ভারতীয় জলখাবার' },
  { id: 'continental', labelEn: 'Continental Light', labelBn: 'কন্টিনেন্টাল' },
  { id: 'mix', labelEn: 'Any / Chef’s Mix', labelBn: 'সব ধরনের মিশ্রণ' }
]);

export const DIET_TYPES = Object.freeze([
  { id: 'vegetarian', labelEn: 'Vegetarian', labelBn: 'নিরামিষ' },
  { id: 'eggetarian', labelEn: 'Eggetarian', labelBn: 'ডিম সহ নিরামিষ' },
  { id: 'non_vegetarian', labelEn: 'Non-Vegetarian', labelBn: 'আমিষ' },
  { id: 'vegan', labelEn: 'Vegan (Plant-Only)', labelBn: 'সম্পূর্ণ উদ্ভিজ্জ (ভিগান)' }
]);

export const PREP_TIMES = Object.freeze([
  { id: 5, labelEn: '5 Mins (No-Cook)', labelBn: '৫ মিনিট (রান্না ছাড়া)' },
  { id: 10, labelEn: 'Up to 10 Mins', labelBn: '১০ মিনিটের মধ্যে' },
  { id: 15, labelEn: 'Up to 15 Mins', labelBn: '১৫ মিনিটের মধ্যে' },
  { id: 0, labelEn: 'No Time Bound (Weekend)', labelBn: 'সময়ের বাঁধন নেই (ছুটির সকাল)' }
]);

/**
 * 5. Indian Quick-Commerce Deep-Link Providers (Zero-Cost URL Search Integration)
 */
export const QUICK_COMMERCE_PROVIDERS = Object.freeze([
  {
    id: 'blinkit',
    name: 'Blinkit',
    accentClass: 'qc-blinkit',
    buildUrl: (englishQuery) => `https://blinkit.com/s/?q=${encodeURIComponent(englishQuery.trim())}`
  },
  {
    id: 'zepto',
    name: 'Zepto',
    accentClass: 'qc-zepto',
    buildUrl: (englishQuery) => `https://www.zeptonow.com/search?query=${encodeURIComponent(englishQuery.trim())}`
  },
  {
    id: 'instamart',
    name: 'Instamart',
    accentClass: 'qc-instamart',
    buildUrl: (englishQuery) => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(englishQuery.trim())}`
  },
  {
    id: 'bigbasket',
    name: 'BigBasket',
    accentClass: 'qc-bigbasket',
    buildUrl: (englishQuery) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(englishQuery.trim())}`
  }
]);