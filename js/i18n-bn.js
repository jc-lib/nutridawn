/**
 * NutriDawn — Bilingual Dictionary (English & Standardized Bengali Unicode)
 * Enforces NFC Unicode normalization to protect Bengali conjuncts (যুক্তাক্ষর) & vowel signs (কার).
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

/**
 * Sanitizes and normalizes Bengali Unicode text into Canonical Composition (NFC)
 * so conjunct consonants render cleanly across Windows, macOS, Android, and iOS.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeBengali(input) {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFC')
    .replace(/\uFFFD/g, '')
    .trim();
}

export const I18N = Object.freeze({
  en: {
    tagline: 'Smart, Simple Breakfasts Tailored to Your Health.',
    welcomeHeading: 'Good morning! Let’s plan a breakfast that feels kind to your body.',
    welcomeSubtext: 'Tell us a little about yourself, and we will suggest three easy-to-cook morning ideas tailored to your needs.',
    step1Prompt: 'Who are we preparing breakfast for today?',
    step1Subprompt: 'We automatically balance essential vitamins, protein, and energy for your stage of life.',
    step2Prompt: 'Which flavors and kitchen style do you enjoy in the morning?',
    step3Prompt: 'Is there anything your body needs extra care with right now?',
    step3Subprompt: 'Completely optional — skip this if you simply want wholesome everyday nutrition.',
    privacyNote: 'Your preferences stay privately on your own device so you never have to re-enter them.',
    savedWelcomeBack: 'Welcome back! Your saved morning preferences are ready.',
    updatePrefsBtn: 'Update Preferences',
    clearPrefsBtn: 'Reset Saved Data',
    generateOptionsBtn: 'Show 3 Breakfast Ideas',
    generatingLoader: 'Crafting 3 gentle, nutritious breakfast options for you...',
    optionsSectionTitle: 'Choose Your Morning Favorite',
    optionsSectionSubtitle: 'Pick any one option below to view step-by-step instructions, ingredients, and instant grocery links.',
    chooseRecipeBtn: 'Cook This Dish',
    backToOptionsBtn: 'Back to 3 Options',
    ingredientsTitle: 'Ingredients & Quantities',
    ingredientsHint: 'Tap items you already have at home. Need something fresh? Order in 1 tap:',
    quickOrderLabel: 'Order missing item:',
    copyMissingBtn: 'Copy Missing Grocery List',
    copiedToast: 'Missing grocery list copied to clipboard!',
    stepsTitle: 'Easy Step-by-Step Preparation',
    cookingModeBtn: 'Start Distraction-Free Cooking Mode',
    exitCookingModeBtn: 'Exit Cooking Mode',
    timerStart: 'Start Timer',
    timerPause: 'Pause',
    timerReset: 'Reset',
    pantrySwapTitle: 'Smart Kitchen Swaps',
    nutritionWhyTitle: 'Why This Fits Your Body Today',
    shareCardBtn: 'Download Colorful Recipe Card',
    byokToggleBtn: 'Optional AI Key Settings',
    aiPhotoBadge: 'AI Dish Preview',
    stockPhotoBadge: 'Public Domain Photo',
    wellnessDisclaimer: 'Wellness Note: Suggestions support everyday healthy eating and do not replace medical advice from your doctor or dietitian.'
  },
  bn: {
    tagline: sanitizeBengali('আপনার স্বাস্থ্যের উপযোগী স্মার্ট ও সহজ সকালের জলখাবার।'),
    welcomeHeading: sanitizeBengali('সুপ্রভাত! আসুন আপনার শরীরের যত্ন নেয় এমন একটি জলখাবার বেছে নিই।'),
    welcomeSubtext: sanitizeBengali('আপনার সম্পর্কে সামান্য তথ্য দিন—আমরা আপনার প্রয়োজন অনুযায়ী ৩টি সহজ ও পুষ্টিকর সকালের জলখাবারের পরামর্শ দেব।'),
    step1Prompt: sanitizeBengali('আজ কার জন্য সকালের জলখাবার তৈরি হচ্ছে?'),
    step1Subprompt: sanitizeBengali('বয়স ও শরীরের গঠন অনুযায়ী আমরা স্বয়ংক্রিয়ভাবে প্রোটিন, ভিটামিন ও শক্তির ভারসাম্য ঠিক করি।'),
    step2Prompt: sanitizeBengali('সকালে কোন ধরনের খাবার ও রান্নার ধরন আপনার পছন্দ?'),
    step3Prompt: sanitizeBengali('বর্তমানে আপনার শরীরের কি কোনো বিশেষ যত্ন বা খাবারের সতর্কতা প্রয়োজন?'),
    step3Subprompt: sanitizeBengali('এটি সম্পূর্ণ ঐচ্ছিক — সাধারণ ও পুষ্টিকর জলখাবার চাইলে এটি এড়িয়ে যেতে পারেন।'),
    privacyNote: sanitizeBengali('আপনার পছন্দগুলো শুধুমাত্র আপনার নিজের ডিভাইসেই সুরক্ষিত থাকবে, যাতে পরের বার আবার লিখতে না হয়।'),
    savedWelcomeBack: sanitizeBengali('স্বাগতম! আপনার সংরক্ষিত পছন্দগুলো প্রস্তুত রয়েছে।'),
    updatePrefsBtn: sanitizeBengali('পছন্দ পরিবর্তন করুন'),
    clearPrefsBtn: sanitizeBengali('সংরক্ষিত তথ্য মুছুন'),
    generateOptionsBtn: sanitizeBengali('৩টি জলখাবারের বিকল্প দেখুন'),
    generatingLoader: sanitizeBengali('আপনার জন্য ৩টি স্বাস্থ্যকর ও সহজ জলখাবারের তালিকা তৈরি হচ্ছে...'),
    optionsSectionTitle: sanitizeBengali('আপনার পছন্দের জলখাবারটি বেছে নিন'),
    optionsSectionSubtitle: sanitizeBengali('উপকরণ, সহজ প্রস্তুত প্রণালী ও গ্রোসারি লিংক দেখতে যেকোনো একটি বিকল্পে ক্লিক করুন।'),
    chooseRecipeBtn: sanitizeBengali('এই পদটি রান্না করুন'),
    backToOptionsBtn: sanitizeBengali('৩টি বিকল্পে ফিরে যান'),
    ingredientsTitle: sanitizeBengali('উপকরণ ও সঠিক পরিমাণ'),
    ingredientsHint: sanitizeBengali('ঘরে থাকা উপকরণে টিক দিন। কোনো উপকরণ না থাকলে এক ক্লিকেই অর্ডার করুন:'),
    quickOrderLabel: sanitizeBengali('কিনুন:'),
    copyMissingBtn: sanitizeBengali('বাকি বাজারের তালিকা কপি করুন'),
    copiedToast: sanitizeBengali('বাজারের তালিকা কপি করা হয়েছে!'),
    stepsTitle: sanitizeBengali('সহজ প্রস্তুত প্রণালী'),
    cookingModeBtn: sanitizeBengali('সহজ কুকিং মোড চালু করুন'),
    exitCookingModeBtn: sanitizeBengali('কুকিং মোড বন্ধ করুন'),
    timerStart: sanitizeBengali('টাইমার শুরু'),
    timerPause: sanitizeBengali('বিরতি'),
    timerReset: sanitizeBengali('রিসেট'),
    pantrySwapTitle: sanitizeBengali('ঘরোয়া বিকল্প উপকরণ'),
    nutritionWhyTitle: sanitizeBengali('কেন এই খাবারটি আপনার জন্য উপকারী'),
    shareCardBtn: sanitizeBengali('রঙিন রেসিপি কার্ড ডাউনলোড করুন'),
    byokToggleBtn: sanitizeBengali('ঐচ্ছিক এআই কী সেটিংস'),
    aiPhotoBadge: sanitizeBengali('এআই খাবারের ছবি'),
    stockPhotoBadge: sanitizeBengali('পাবলিক ডোমেইন ছবি'),
    wellnessDisclaimer: sanitizeBengali('স্বাস্থ্যবার্তা: এই পরামর্শগুলো সাধারণ সুস্বাস্থ্যের জন্য; বিশেষ চিকিৎসার প্রয়োজনে চিকিৎসক বা পুষ্টিবিদের পরামর্শ নিন।')
  }
});

/**
 * Helper to fetch a localized string with automatic NFC sanitization.
 * @param {'en'|'bn'} lang
 * @param {string} key
 * @returns {string}
 */
export function t(lang, key) {
  const dict = I18N[lang] || I18N.en;
  const raw = dict[key] || I18N.en[key] || key;
  return lang === 'bn' ? sanitizeBengali(raw) : raw;
}