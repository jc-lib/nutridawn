/**
 * NutriDawn — Colorful Shareable Recipe Poster & PNG Exporter
 * Generates a high-contrast Kitchen Editorial recipe card and exports it via html2canvas.
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

import { APP_CONFIG } from './config.js';
import { sanitizeBengali } from './i18n-bn.js';
import { buildEditorialFallbackSvg } from './media-service.js';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders the colorful shareable poster markup inside the modal mount point.
 */
export function renderSharePoster(mountEl, recipe, imageUrl, lang = 'en') {
  if (!mountEl || !recipe) return;

  const isBn = lang === 'bn';
  const formatText = (val) => escapeHtml(isBn ? sanitizeBengali(val) : val);
  const safeImg = imageUrl || buildEditorialFallbackSvg(recipe.title);

  const ingredientsHtml = (recipe.ingredients || [])
    .map(
      (ing) => `
      <li style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px dashed #e2bfb8;font-size:12.5px;">
        <span style="font-weight:600;color:#350e13;">${formatText(ing.displayName)}</span>
        <span style="color:#ae2818;font-weight:700;white-space:nowrap;">${formatText(ing.quantity)}</span>
      </li>`
    )
    .join('');

  const stepsHtml = (recipe.steps || [])
    .map(
      (step, idx) => `
      <li style="margin-bottom:6px;font-size:12.5px;line-height:1.5;color:#350e13;">
        <strong style="color:#ae2818;">${idx + 1}.</strong> ${formatText(step)}
      </li>`
    )
    .join('');

  mountEl.innerHTML = `
    <div id="ndSharePosterCard" class="nd-share-poster">
      <div class="nd-share-poster-header">
        <div>
          <div style="font-size:24px;font-weight:800;color:#ae2818;letter-spacing:0.03em;line-height:1.1;">
            NutriDawn
          </div>
          <div style="font-size:11.5px;color:#a33948;font-weight:600;">
            ${formatText(isBn ? APP_CONFIG.taglineBn : APP_CONFIG.taglineEn)}
          </div>
        </div>
        <span style="background:#ffdad4;color:#400100;padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700;">
          ${formatText(recipe.categoryTag || 'Morning Studio')} • ${recipe.prepMinutes}m
        </span>
      </div>

      <div class="nd-share-poster-hero">
        <img src="${safeImg}" crossorigin="anonymous" alt="${formatText(recipe.title)}" onerror="this.src='${buildEditorialFallbackSvg(recipe.title)}'" />
        <div>
          <span style="display:inline-block;background:#f4d9ff;color:#30004b;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:700;margin-bottom:6px;">
            ${formatText(recipe.glycemicTag || 'Balanced Nutrition')}
          </span>
          <h4 style="font-size:21px;font-weight:800;color:#350e13;margin:0 0 6px 0;line-height:1.25;">
            ${formatText(recipe.title)}
          </h4>
          <p style="font-size:12.5px;color:#5a413c;margin:0;line-height:1.45;">
            ${formatText(recipe.healthRationale || recipe.subtitle)}
          </p>
        </div>
      </div>

      <div class="nd-share-macro-strip">
        <div class="nd-share-macro-box">
          <div style="font-size:16px;font-weight:800;color:#ae2818;">${recipe.calories || 280}</div>
          <div style="font-size:10.5px;color:#5a413c;font-weight:600;">${isBn ? 'ক্যালোরি (Kcal)' : 'Calories'}</div>
        </div>
        <div class="nd-share-macro-box">
          <div style="font-size:16px;font-weight:800;color:#a33948;">${recipe.proteinGrams || 15}g</div>
          <div style="font-size:10.5px;color:#5a413c;font-weight:600;">${isBn ? 'প্রোটিন' : 'Protein'}</div>
        </div>
        <div class="nd-share-macro-box">
          <div style="font-size:16px;font-weight:800;color:#7c41a2;">${recipe.carbsGrams || 32}g</div>
          <div style="font-size:10.5px;color:#5a413c;font-weight:600;">${isBn ? 'শর্করা (Carbs)' : 'Carbs'}</div>
        </div>
        <div class="nd-share-macro-box">
          <div style="font-size:16px;font-weight:800;color:#350e13;">${recipe.fatGrams || 8}g</div>
          <div style="font-size:10.5px;color:#5a413c;font-weight:600;">${isBn ? 'স্বাস্থ্যকর ফ্যাট' : 'Healthy Fat'}</div>
        </div>
      </div>

      <div class="nd-share-poster-body">
        <div>
          <h5 style="font-size:13px;font-weight:800;color:#ae2818;margin:0 0 8px 0;text-transform:uppercase;">
            ${isBn ? 'উপকরণ ও পরিমাণ' : 'Ingredients'}
          </h5>
          <ul style="list-style:none;padding:0;margin:0;">
            ${ingredientsHtml}
          </ul>
        </div>
        <div>
          <h5 style="font-size:13px;font-weight:800;color:#ae2818;margin:0 0 8px 0;text-transform:uppercase;">
            ${isBn ? 'সহজ প্রস্তুত প্রণালী' : 'Quick Steps'}
          </h5>
          <ol style="list-style:none;padding:0;margin:0;">
            ${stepsHtml}
          </ol>
        </div>
      </div>

      <div class="nd-share-poster-footer">
        <span style="font-weight:700;color:#ae2818;">${escapeHtml(APP_CONFIG.attribution)}</span>
        <span>${isBn ? 'সাধারণ সুস্বাস্থ্যের জন্য পরামর্শ' : 'General Wellness Nutrition Guide'}</span>
      </div>
    </div>
  `;
}

/**
 * Captures #ndSharePosterCard using html2canvas and triggers a PNG download.
 */
export async function downloadPosterAsPng(dishTitle = 'NutriDawn-Recipe') {
  const posterEl = document.getElementById('ndSharePosterCard');
  if (!posterEl) return false;

  if (typeof window.html2canvas !== 'function') {
    window.print();
    return false;
  }

  const canvas = await window.html2canvas(posterEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#fff8f7'
  });

  const slug = String(dishTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'recipe';

  const link = document.createElement('a');
  link.download = `NutriDawn-${slug}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}