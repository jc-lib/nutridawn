/**
 * NutriDawn — Colorful Shareable Recipe Poster & Print Exporter
 * Uses html2canvas for high-resolution PNG export at fixed 820px editorial layout
 * with responsive viewport scaling for mobile preview.
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

import { APP_CONFIG } from './config.js';
import { sanitizeBengali, t } from './i18n-bn.js';
import { buildEditorialFallbackSvg } from './media-service.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fitPosterPreviewToViewport(mountEl) {
  if (!mountEl) return;
  const wrapper = mountEl.querySelector('.nd-poster-scale-wrapper');
  const poster = mountEl.querySelector('#ndSharePoster');
  if (!wrapper || !poster) return;

  const availableWidth = mountEl.clientWidth || Math.max(280, window.innerWidth - 56);
  const posterWidth = 820;

  if (availableWidth < posterWidth) {
    const scale = Math.max(0.32, availableWidth / posterWidth);
    poster.style.transform = `scale(${scale})`;
    // Adjust wrapper height so there is no empty whitespace below the scaled card
    requestAnimationFrame(() => {
      const naturalHeight = poster.offsetHeight || 720;
      wrapper.style.height = `${Math.ceil(naturalHeight * scale)}px`;
    });
  } else {
    poster.style.transform = 'none';
    wrapper.style.height = 'auto';
  }
}

export function renderSharePoster(mountEl, recipe, imageUrl, lang = 'en') {
  if (!mountEl || !recipe) return;

  const isBn = lang === 'bn';
  const fmt = (val) => escapeHtml(isBn ? sanitizeBengali(val) : val);
  const safeImg = imageUrl || buildEditorialFallbackSvg(recipe.title);

  const ingredientsHtml = (recipe.ingredients || [])
    .map(
      (ing) => `
      <li>
        <span>${fmt(ing.displayName)}</span>
        <span>${fmt(ing.quantity)}</span>
      </li>`
    )
    .join('');

  const stepsHtml = (recipe.steps || [])
    .map((step) => `<li>${fmt(step)}</li>`)
    .join('');

  mountEl.innerHTML = `
    <div class="nd-poster-scale-wrapper">
      <div id="ndSharePoster" class="nd-share-poster">
        <div class="nd-poster-header">
          <div>
            <div class="nd-poster-brand">NutriDawn</div>
            <div class="nd-poster-tagline">${fmt(t(lang, 'tagline'))}</div>
          </div>
          <div class="nd-poster-pill">
            ${fmt(recipe.categoryTag)} • ${recipe.prepMinutes}m
          </div>
        </div>

        <div class="nd-poster-hero">
          <img
            src="${safeImg}"
            alt="${fmt(recipe.title)}"
            crossorigin="anonymous"
            onerror="this.onerror=null;this.src='${buildEditorialFallbackSvg(recipe.title)}';"
          />
          <div>
            <span class="nd-poster-badge">${fmt(recipe.glycemicTag)}</span>
            <h2 class="nd-poster-title">${fmt(recipe.title)}</h2>
            <p class="nd-poster-rationale">${fmt(recipe.healthRationale)}</p>
          </div>
        </div>

        <div class="nd-poster-macros">
          <div class="nd-macro-box">
            <span class="nd-macro-val">${recipe.calories}</span>
            <span class="nd-macro-lbl">${isBn ? 'ক্যালোরি (Kcal)' : 'Calories'}</span>
          </div>
          <div class="nd-macro-box">
            <span class="nd-macro-val">${recipe.proteinGrams}g</span>
            <span class="nd-macro-lbl">${isBn ? 'প্রোটিন' : 'Protein'}</span>
          </div>
          <div class="nd-macro-box">
            <span class="nd-macro-val">${recipe.carbsGrams}g</span>
            <span class="nd-macro-lbl">${isBn ? 'শর্করা (Carbs)' : 'Carbs'}</span>
          </div>
          <div class="nd-macro-box">
            <span class="nd-macro-val">${recipe.fatGrams}g</span>
            <span class="nd-macro-lbl">${isBn ? 'স্বাস্থ্যকর ফ্যাট' : 'Healthy Fat'}</span>
          </div>
        </div>

        <div class="nd-poster-body">
          <div>
            <h3 class="nd-poster-section-title">${isBn ? 'উপকরণ ও পরিমাণ' : 'Ingredients'}</h3>
            <ul class="nd-poster-ing-list">${ingredientsHtml}</ul>
          </div>
          <div>
            <h3 class="nd-poster-section-title">${isBn ? 'সহজ প্রস্তুত প্রণালী' : 'Quick Steps'}</h3>
            <ol class="nd-poster-steps-list">${stepsHtml}</ol>
          </div>
        </div>

        <div class="nd-poster-footer">
          <span class="nd-poster-attribution">${escapeHtml(APP_CONFIG.attribution)}</span>
          <span>${isBn ? 'সাধারণ সুস্বাস্থ্যের জন্য পরামর্শ' : 'General Wellness Nutrition Guide'}</span>
        </div>
      </div>
    </div>
  `;

  fitPosterPreviewToViewport(mountEl);

  if (!mountEl._resizeBound) {
    mountEl._resizeBound = true;
    window.addEventListener('resize', () => fitPosterPreviewToViewport(mountEl));
  }
}

export async function downloadPosterAsPng(recipeTitle = 'nutridawn-recipe') {
  const posterEl = document.getElementById('ndSharePoster');
  if (!posterEl) return false;

  if (typeof window.html2canvas !== 'function') {
    window.print();
    return false;
  }

  const prevTransform = posterEl.style.transform;
  const wrapper = posterEl.parentElement;
  const prevWrapperHeight = wrapper ? wrapper.style.height : '';

  try {
    // Temporarily reset mobile preview scaling to full 820px width for crisp PNG capture
    posterEl.style.transform = 'none';
    if (wrapper) wrapper.style.height = 'auto';

    const canvas = await window.html2canvas(posterEl, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#fff8f7',
      width: 820,
      windowWidth: 960
    });

    const slug = String(recipeTitle)
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
      .replace(/^-|-$/g, '') || 'breakfast-card';

    const link = document.createElement('a');
    link.download = `NutriDawn-${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.warn('[NutriDawn PNG Export Fallback to Print]:', err);
    window.print();
    return false;
  } finally {
    posterEl.style.transform = prevTransform;
    if (wrapper) wrapper.style.height = prevWrapperHeight;
  }
}