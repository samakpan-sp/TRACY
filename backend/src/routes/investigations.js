import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const VALID_SUBJECT_TYPES = ['url', 'business_advert', 'social_profile', 'phone_number'];
const VALID_EVIDENCE_TYPES = ['message', 'url', 'screenshot', 'video'];
const VALID_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'whatsapp', 'telegram', 'youtube', 'other'];

router.post('/', requireAuth, (req, res) => {
  const { subject_type, subject_value, subject_platform, evidence, user_context, subject_claims } = req.body;

  // --- Validation ---
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

  // --- MOCK response — real analysis pipeline arrives Milestone 4+ ---
  const mockReport = {
    subject_type,
    subject_value,
    subject_platform: subject_type === 'social_profile' ? subject_platform : null,
    evidence,
    user_context: user_context || '',
    subject_claims: subject_claims || [],
    verified_facts: [
      { fact: 'Placeholder verified fact.', source: 'mock-source', checked_at: new Date().toISOString() },
    ],
    user_claims: [
      { claim: 'Placeholder unverified claim.' },
    ],
    possible_connections: [
      { connection: 'Placeholder inferred connection.', reasoning: 'Mock — real inference comes later.' },
    ],
    risk_indicators: [
      { indicator: 'Placeholder risk pattern.', reasoning: 'Mock — real detection comes in Milestone 9.' },
    ],
    unknown_flags: ['Placeholder — not determinable from mock evidence.'],
    confidence_level: {
      level: 'low',
      justification: 'Mock data — no real evidence analyzed yet.',
    },
    recommended_next_steps: [
      'Placeholder recommendation.',
      'Real recommendations arrive once AI analysis is wired in.',
    ],
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  };

  res.json(mockReport);
});

export default router;