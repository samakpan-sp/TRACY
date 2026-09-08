import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import EvidenceInput from './EvidenceInput';
import SubjectClaimsInput from './SubjectClaimsInput';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const SUBJECT_TYPES = [
  { value: 'url', label: 'Website / URL' },
  { value: 'business_advert', label: 'Business advert' },
  { value: 'social_profile', label: 'Social media handle' },
  { value: 'phone_number', label: 'Phone number' },
];

const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Other' },
];

function InvestigationForm({ onReportReceived }) {
  const [subjectType, setSubjectType] = useState('url');
  const [subjectValue, setSubjectValue] = useState('');
  const [subjectPlatform, setSubjectPlatform] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [userContext, setUserContext] = useState('');
  const [subjectClaims, setSubjectClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subjectPlaceholder = {
    url: 'https://example.com',
    business_advert: 'Describe the advert (platform, what it offers, contact details shown)',
    social_profile: '@handle or profile link',
    phone_number: '+234...',
  }[subjectType];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (subjectType === 'social_profile' && !subjectPlatform) {
      setError('Please select which platform this profile is on.');
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/investigations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject_type: subjectType,
          subject_value: subjectValue,
          subject_platform: subjectType === 'social_profile' ? subjectPlatform : null,
          evidence,
          user_context: userContext,
          subject_claims: subjectClaims,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server responded ${res.status}`);
      }

      const report = await res.json();
      onReportReceived(report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
      <h2>New Investigation</h2>

      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
        What are you investigating?
      </label>
      <select
        value={subjectType}
        onChange={(e) => {
          setSubjectType(e.target.value);
          setSubjectValue('');
          setSubjectPlatform(null);
        }}
        style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
      >
        {SUBJECT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {subjectType === 'social_profile' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Which platform?
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SOCIAL_PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSubjectPlatform(p.value)}
                style={{
                  padding: '0.4rem 0.8rem',
                  border: subjectPlatform === p.value ? '2px solid #333' : '1px solid #ccc',
                  background: subjectPlatform === p.value ? '#eee' : '#fff',
                  borderRadius: '20px',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        value={subjectValue}
        onChange={(e) => setSubjectValue(e.target.value)}
        required
        placeholder={subjectPlaceholder}
        style={{ display: 'block', width: '100%', marginBottom: '1rem' }}
      />

      <EvidenceInput evidence={evidence} setEvidence={setEvidence} />

      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
        What do you know about this?
      </label>
      <p style={{ fontSize: '0.85rem', color: '#555', marginTop: 0 }}>
        Your context helps TRACY identify contradictions.
      </p>
      <textarea
        value={userContext}
        onChange={(e) => setUserContext(e.target.value)}
        rows={3}
        placeholder="Any background you already have on this situation"
        style={{ display: 'block', width: '100%', marginBottom: '1rem' }}
      />

      <SubjectClaimsInput claims={subjectClaims} setClaims={setSubjectClaims} />

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Analyzing...' : 'Run Investigation'}
      </button>
    </form>
  );
}

export default InvestigationForm;