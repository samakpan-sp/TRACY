import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY in backend .env');
}

const genAI = new GoogleGenerativeAI(apiKey);
const PRIMARY_MODEL = process.env.ANALYSIS_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODEL = process.env.FALLBACK_ANALYSIS_MODEL || 'gemini-3-flash-preview';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isModelUnavailableError(err) {
  const msg = err.message || '';
  return msg.includes('404') || msg.includes('no longer available') || msg.includes('not found');
}

function isTransientError(err) {
  const msg = err.message || '';
  return msg.includes('429') || msg.includes('503');
}

async function callWithResilience(getModelFn, promptOrFn, { retries = 2, baseDelayMs = 1500 } = {}) {
  let currentModelName = PRIMARY_MODEL;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const model = getModelFn(currentModelName);
      return await promptOrFn(model);
    } catch (err) {
      lastErr = err;

      if (isModelUnavailableError(err) && currentModelName !== FALLBACK_MODEL) {
        console.warn(`Model "${currentModelName}" unavailable, switching to fallback "${FALLBACK_MODEL}"`);
        currentModelName = FALLBACK_MODEL;
        continue;
      }

      if (isTransientError(err) && attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`Transient AI error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }
  throw lastErr;
}

// NOTE: External subject verification (page fetch, search fallback, and
// licensed phone lookup) is handled upstream by subjectVerificationService.js
// and passed in as `externalSubjectInfo`. This service never performs its
// own web lookups — it only reasons over what it's given, and only cites
// sources that are actually present in that data.

const SYSTEM_PROMPT = `You are TRACY's analysis engine, part of a digital trust investigation tool.

Analyze the evidence, context, and any external subject information provided, and produce a cautious, structured evidence breakdown. Follow these rules strictly:

1. NEVER invent facts, sources, or evidence not present in the input.
2. NEVER state or imply anyone "is a scammer" or "is a criminal" — describe patterns, not verdicts.
3. You may sometimes be given "External information about the subject" from a real page fetch, search lookup, or licensed phone verification. You may cite this as verified_facts ONLY using the exact source given. If no external information was found or it wasn't applicable, treat the subject itself as unverified and say so in unknown_flags — do not guess.
3a. When the subject is a phone number, "External information" may include licensed carrier/line-type data (source: "Veriphone API lookup"). Treat this as a real verified_fact. Actively cross-reference it against subject_claims — e.g. a claim of calling from an official organization is worth flagging as a possible_connection or risk_indicator if the licensed data shows a prepaid, VoIP, or foreign-registered line inconsistent with that claim. Also check whether search findings show this exact number associated with similar offers/complaints elsewhere.
4. Text labeled "screenshot OCR text" may contain character-recognition errors — do not treat garbled or ambiguous OCR output as a precise quote; describe it cautiously.
5. Text labeled "video content analysis" is an AI-generated description of video content, not a verified transcript or authenticity check. Do not treat it as more reliable than it is, and do not comment on whether the video itself is genuine or manipulated.
6. Separate findings into exactly these categories:
   - verified_facts: objective observations about the text evidence itself, OR real findings from external information — each with an honest, specific source.
   - user_claims: pass through anything the user told you as context, unverified.
   - possible_connections: inferred links between details in the message, user_context, subject_claims, and any external information — always labeled as inference.
   - risk_indicators: recognized scam/fraud patterns (urgency, requests for money/gift cards/crypto, impersonation of authority, too-good-to-be-true offers, pressure to act off-platform). Explain WHY each is a risk indicator — never proof of wrongdoing.
   - unknown_flags: anything relevant that cannot be determined from the evidence or external information alone.
7. Cross-reference "subject_claims" against the message content, user_context, AND external information. Name which specific subject_claim any contradiction relates to.
8. confidence_level must be "low", "medium", or "high" with a plain-language justification. Note explicitly when confidence is limited by missing external verification, OCR uncertainty, or unverified video content.
9. recommended_next_steps must be practical, safe, user-executable verification steps.

Respond with ONLY a single valid JSON object — no markdown fences, no commentary — matching exactly:

{
  "verified_facts": [{ "fact": string, "source": string }],
  "user_claims": [{ "claim": string }],
  "possible_connections": [{ "connection": string, "reasoning": string }],
  "risk_indicators": [{ "indicator": string, "reasoning": string }],
  "unknown_flags": [string],
  "confidence_level": { "level": "low" | "medium" | "high", "justification": string },
  "recommended_next_steps": [string]
}`;

function normalizeAnalysis(parsed) {
  return {
    verified_facts: Array.isArray(parsed.verified_facts) ? parsed.verified_facts : [],
    user_claims: Array.isArray(parsed.user_claims) ? parsed.user_claims : [],
    possible_connections: Array.isArray(parsed.possible_connections) ? parsed.possible_connections : [],
    risk_indicators: Array.isArray(parsed.risk_indicators) ? parsed.risk_indicators : [],
    unknown_flags: Array.isArray(parsed.unknown_flags) ? parsed.unknown_flags : [],
    confidence_level: parsed.confidence_level && typeof parsed.confidence_level === 'object'
      ? {
          level: ['low', 'medium', 'high'].includes(parsed.confidence_level.level) ? parsed.confidence_level.level : 'low',
          justification: parsed.confidence_level.justification || 'No justification provided by the model.',
        }
      : { level: 'low', justification: 'Confidence data was missing from the analysis.' },
    recommended_next_steps: Array.isArray(parsed.recommended_next_steps) ? parsed.recommended_next_steps : [],
  };
}

export async function analyzeMessageEvidence({
  subjectType,
  subjectValue,
  subjectPlatform,
  evidence,
  userContext,
  subjectClaims,
  externalSubjectInfo,
}) {
  const textEvidence = evidence
    .filter((e) =>
      e.type === 'message' ||
      e.type === 'url' ||
      (e.type === 'screenshot' && e.ocr_text) ||
      (e.type === 'video' && e.video_analysis_text)
    )
    .map((e) => {
      if (e.type === 'screenshot') {
        return `[screenshot OCR text — may contain recognition errors] ${e.ocr_text}`;
      }
      if (e.type === 'video') {
        return `[video content analysis — AI-generated description, not verified for authenticity] ${e.video_analysis_text}`;
      }
      return `[${e.type}] ${e.content}`;
    })
    .join('\n\n');

  const realSources = (externalSubjectInfo?.findings || []).map((f) => f.source);

  const externalInfoText = (externalSubjectInfo?.findings?.length || 0) > 0
    ? externalSubjectInfo.findings
        .map((f) => `Source: ${f.source}\nTitle: ${f.title}\nContent: ${f.content}`)
        .join('\n\n')
    : 'No external information was found or retrieval was not applicable.';

  const externalNote = externalSubjectInfo?.note ? `\nNote: ${externalSubjectInfo.note}` : '';

  const userPrompt = `Subject being investigated: ${subjectType}${subjectPlatform ? ` (platform: ${subjectPlatform})` : ''} — "${subjectValue}"

User's background context: ${userContext || 'None provided.'}

Claims the subject made to the user:
${subjectClaims.length > 0 ? subjectClaims.map((c) => `- ${c}`).join('\n') : 'None provided.'}

Evidence submitted:
${textEvidence || 'None provided.'}

External information about the subject (method: ${externalSubjectInfo?.method || 'none'}):${externalNote}
${externalInfoText}

Analyze per your instructions and return the JSON object only.`;

  const result = await callWithResilience(
    (modelName) => genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' },
    }),
    (model) => model.generateContent(userPrompt)
  );

  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse AI response as JSON: ${err.message}`);
  }

  // Code-level enforcement: any verified_fact must cite either the
  // submitted evidence, or a source that's actually in our real
  // fetch/search/lookup results — never a source the model invented.
   const normalized = normalizeAnalysis(parsed);

  const allowedTextSources = ['submitted message content', 'submitted evidence', 'submitted url', 'screenshot ocr', 'video content analysis', 'veriphone api lookup'];
  normalized.verified_facts = normalized.verified_facts.filter((f) => {
    const sourceLower = (f?.source || '').toLowerCase();
    const isTextSource = allowedTextSources.some((s) => sourceLower.includes(s));
    const isRealExternalSource = realSources.some((url) => sourceLower.includes(url.toLowerCase()) || f?.source === url);
    return isTextSource || isRealExternalSource;
  });

  return normalized;

  return parsed;
}