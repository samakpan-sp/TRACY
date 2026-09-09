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

// NOTE: Real-time external subject verification (search grounding) is
// intentionally not implemented here — Gemini's Google Search grounding
// tool requires a paid tier on the 3.x model family and is account-gated
// on 2.5. Real external subject verification is deferred to Milestone 7
// as a deliberate provider decision (likely a dedicated free search API).

const SYSTEM_PROMPT = `You are TRACY's message-analysis engine, part of a digital trust investigation tool.

Analyze the message/URL/screenshot evidence and context provided, and produce a cautious, structured evidence breakdown. Follow these rules strictly:

1. NEVER invent facts, sources, or evidence not present in the input.
2. NEVER state or imply anyone "is a scammer" or "is a criminal" — describe patterns, not verdicts.
3. You have NO external verification capability in this step — do not claim to have checked anything beyond the text you were given. Any real-world fact about the subject that you have not been given as evidence belongs in unknown_flags, not verified_facts.
4. Text labeled "screenshot OCR text" may contain character-recognition errors — do not treat garbled or ambiguous OCR output as a precise quote; describe it cautiously and note the possibility of misreading where relevant.
5. Separate findings into exactly these categories:
   - verified_facts: only objective observations about the text evidence ITSELF (e.g. "the message requests payment via gift card").
   - user_claims: pass through anything the user told you as context, unverified.
   - possible_connections: inferred links between details in the message, user_context, and subject_claims — always labeled as inference.
   - risk_indicators: recognized scam/fraud patterns (urgency, requests for money/gift cards/crypto, impersonation of authority, too-good-to-be-true offers, pressure to act off-platform). Explain WHY each is a risk indicator — never proof of wrongdoing.
   - unknown_flags: anything relevant that cannot be determined from the evidence alone — including whether the subject itself is legitimate, since no external check was performed.
6. Cross-reference "subject_claims" against the message content and user_context. Name which specific subject_claim any contradiction relates to.
7. confidence_level must be "low", "medium", or "high" with a plain-language justification. Note explicitly when confidence is limited by the lack of external verification or by OCR uncertainty.
8. recommended_next_steps must be practical, safe, user-executable verification steps.

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

export async function analyzeMessageEvidence({
  subjectType,
  subjectValue,
  subjectPlatform,
  evidence,
  userContext,
  subjectClaims,
}) {
  const textEvidence = evidence
    .filter((e) => e.type === 'message' || e.type === 'url' || (e.type === 'screenshot' && e.ocr_text))
    .map((e) => {
      if (e.type === 'screenshot') {
        return `[screenshot OCR text — may contain recognition errors] ${e.ocr_text}`;
      }
      return `[${e.type}] ${e.content}`;
    })
    .join('\n\n');

  const userPrompt = `Subject being investigated: ${subjectType}${subjectPlatform ? ` (platform: ${subjectPlatform})` : ''} — "${subjectValue}"

User's background context: ${userContext || 'None provided.'}

Claims the subject made to the user:
${subjectClaims.length > 0 ? subjectClaims.map((c) => `- ${c}`).join('\n') : 'None provided.'}

Evidence submitted:
${textEvidence || 'None provided.'}

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

  return parsed;
}