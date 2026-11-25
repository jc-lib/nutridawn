/**
 * NutriDawn — Cloudflare Worker Secure AI Proxy (Zero-Cost Tier)
 * Primary Engine: Groq API (Sub-second JSON)
 * Automatic Fallback: Google Gemini Free Tier API
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

const ALLOWED_ORIGINS = [
  'https://clbrsnc-python.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

function getCorsHeaders(requestOrigin) {
  const isLocal =
    requestOrigin &&
    (requestOrigin.startsWith('http://localhost:') ||
      requestOrigin.startsWith('http://127.0.0.1:'));
  const allowOrigin =
    ALLOWED_ORIGINS.includes(requestOrigin) || isLocal
      ? requestOrigin
      : 'https://clbrsnc-python.github.io';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function buildNutritionSystemPrompt(payload) {
  const {
    language = 'en',
    ageLabel = 'Young Adult (20–35)',
    genderLabel = 'Neutral',
    baselineNutrients = '',
    micronutrientFocus = '',
    cuisineLabel = 'Bengali Home-Style',
    dietLabel = 'Vegetarian',
    maxPrepMinutes = 15,
    conditionLabel = 'Just Everyday Wellness',
    clinicalRule = '',
    strictExclusions = []
  } = payload;

  const langInstruction =
    language === 'bn'
      ? 'Output all user-facing display fields (title, subtitle, healthRationale, steps, swapNote, pantrySwapOriginal, pantrySwapReplacement, ingredient.displayName, ingredient.quantity) in natural, idiomatic, grammatically accurate Bengali Unicode script (বাংলা). Keep `englishSearchQuery` and `photoKeywords` strictly in English for image and quick-commerce search compatibility.'
      : 'Output all user-facing display fields in clear, warm, practical English.';

  const exclusionText =
    Array.isArray(strictExclusions) && strictExclusions.length > 0
      ? `STRICTLY FORBIDDEN INGREDIENTS (DO NOT INCLUDE): ${strictExclusions.join(', ')}.`
      : 'Use wholesome, minimally processed everyday ingredients.';

  return `You are NutriDawn's Clinical Culinary Architect. Generate 3 distinct, easy-to-cook breakfast options tailored to the user's exact profile.

USER PROFILE:
- Life Stage: ${ageLabel}
- Gender Focus: ${genderLabel} (${micronutrientFocus})
- Baseline Nutrient Priority: ${baselineNutrients}
- Preferred Cuisine: ${cuisineLabel}
- Dietary Preference: ${dietLabel}
- Maximum Active Prep + Cook Time: ${maxPrepMinutes} minutes
- Wellness / Care Mode: ${conditionLabel}
- Clinical Rule: ${clinicalRule}
- ${exclusionText}

STRICT RULES:
1. Every single recipe MUST take ${maxPrepMinutes} minutes or less from kitchen counter to plate using common household ingredients.
2. Provide 3 genuinely different breakfast dishes (e.g., Option 1: Savory Protein-Rich, Option 2: Light & Gut-Friendly, Option 3: Traditional Comfort Twist).
3. ${langInstruction}
4. Return ONLY valid JSON matching the exact schema below—no markdown fences, no commentary.

REQUIRED JSON SCHEMA:
{
  "options": [
    {
      "id": "opt-1",
      "categoryTag": "Short 2-word tag (e.g. Bengali Heritage / No-Cook Quick)",
      "title": "Dish Name",
      "subtitle": "1-sentence appetizing summary",
      "prepMinutes": 12,
      "calories": 285,
      "proteinGrams": 16,
      "carbsGrams": 34,
      "fatGrams": 8,
      "glycemicTag": "Low-GI / Balanced / Iron-Rich",
      "healthRationale": "1-2 sentences explaining why this fits their age, gender, and wellness mode",
      "photoKeywords": "3-4 English keywords for food photography search",
      "ingredients": [
        {
          "quantity": "1/2 cup",
          "displayName": "Rolled Oats",
          "englishSearchQuery": "rolled oats",
          "aisle": "Grains & Flours"
        }
      ],
      "pantrySwap": {
        "original": "Rolled Oats",
        "replacement": "Sooji / Besan Mix",
        "impactNote": "Same crisp texture & sustained energy"
      },
      "steps": [
        "Step 1 clear concise instruction (under 25 words).",
        "Step 2 clear concise instruction.",
        "Step 3 clear concise instruction.",
        "Step 4 clear concise instruction."
      ]
    }
  ]
}`;
}

async function callGroq(apiKey, systemPrompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the 3 tailored breakfast options JSON now.' }
      ],
      temperature: 0.5,
      max_tokens: 2600,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');
  return JSON.parse(content);
}

async function callGemini(apiKey, systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nGenerate the 3 tailored breakfast options JSON now.` }]
        }
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2600,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Empty Gemini response');
  return JSON.parse(content);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const payload = await request.json();
      const systemPrompt = buildNutritionSystemPrompt(payload);

      let resultJson = null;
      let engineUsed = 'groq';

      if (env.GROQ_API_KEY) {
        try {
          resultJson = await callGroq(env.GROQ_API_KEY, systemPrompt);
        } catch (groqErr) {
          if (env.GEMINI_API_KEY) {
            engineUsed = 'gemini-fallback';
            resultJson = await callGemini(env.GEMINI_API_KEY, systemPrompt);
          } else {
            throw groqErr;
          }
        }
      } else if (env.GEMINI_API_KEY) {
        engineUsed = 'gemini';
        resultJson = await callGemini(env.GEMINI_API_KEY, systemPrompt);
      } else {
        return new Response(
          JSON.stringify({ error: 'Server AI keys not configured. Use BYOK mode in Settings.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ...resultJson,
          meta: { engine: engineUsed, timestamp: new Date().toISOString() }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate breakfast options', details: err.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }
};