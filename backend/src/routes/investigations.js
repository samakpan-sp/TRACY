import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { investigationRateLimiter } from '../middleware/rateLimiter.js';
import { analyzeMessageEvidence } from '../services/messageAnalysisService.js';
import { verifySubject } from '../services/subjectVerificationService.js';

const router = Router();

const VALID_SUBJECT_TYPES = ['url', 'business_advert', 'social_profile', 'phone_number'];
const VALID_EVIDENCE_TYPES = ['message', 'url', 'screenshot', 'video'];
const VALID_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'whatsapp', 'telegram', 'youtube', 'other'];

function canRunAnalysis() {
  // Every subject type now has a real analysis path: text evidence,
  // direct fetch, search fallback, or licensed phone lookup.
  return true;
}

router.post('/', requireAuth, investigationRateLimiter, async (req, res) => {
  const { subject_type, subject_value, subject_platform, evidence, user_context, subject_claims } = req.body;

  if (!VALID_SUBJECT_TYPES.includes(subject_type)) {
    return res.status(400).json({ error: `subject_type must be one of: ${VALID_SUBJECT_TYPES.join(', ')}` });
  }
  if (!subject_value || typeof subject_value !== 'string' || subject_value.trim().length === 0) {
    return res.status(400).json({ error: 'subject_value is required' });
  }
  if (subject_type === 'social_profile') {
    if (!subject_platform || !VALID_PLATFORMS.includes(subject_platform)) {
      return res.status(400).json({ error: `subject_platform is required for social_profile and must be one of: ${VALID_PLATFORMS.join(', ')}` });
    }
  }
  if (!Array.isArray(evidence)) {
    return res.status(400).json({ error: 'evidence must be an array (can be empty)' });
  }
  for (const item of evidence) {
    if (!VALID_EVIDENCE_TYPES.includes(item.type)) {
      return res.status(400).json({ error: `evidence type must be one of: ${VALID_EVIDENCE_TYPES.join(', ')}` });
    }
  }

  const safeUserContext = user_context || '';
  const safeSubjectClaims = Array.isArray(subject_claims) ? subject_claims : [];

  let analysis;

  if (canRunAnalysis()) {
    let externalSubjectInfo = null;
    try {
      externalSubjectInfo = await verifySubject({
        subjectType: subject_type,
        subjectValue: subject_value,
        subjectPlatform: subject_platform || null,
      });
    } catch (err) {
      console.error('Subject verification failed (continuing without it):', err.message);
    }

    try {
      analysis = await analyzeMessageEvidence({
        subjectType: subject_type,
        subjectValue: subject_value,
        subjectPlatform: subject_platform || null,
        evidence,
        userContext: safeUserContext,
        subjectClaims: safeSubjectClaims,
        externalSubjectInfo,
      });
    } catch (err) {
      console.error('Message analysis failed:', err.message);
      return res.status(502).json({
        error: 'AI analysis is currently unavailable. Please try again shortly.',
      });
    }
  }

  const report = {
    subject_type,
    subject_value,
    subject_platform: subject_type === 'social_profile' ? subject_platform : null,
    evidence,
    user_context: safeUserContext,
    subject_claims: safeSubjectClaims,
    ...analysis,
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  };

  res.json(report);
});

export default router;