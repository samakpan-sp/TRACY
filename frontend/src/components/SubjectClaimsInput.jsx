import { useState } from 'react';

function SubjectClaimsInput({ claims, setClaims }) {
  const [draft, setDraft] = useState('');

  const addClaim = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setClaims([...claims, trimmed]);
    setDraft('');
  };

  const removeClaim = (index) => {
    setClaims(claims.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addClaim();
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
        What you've been told (subject claims)
      </label>
      <p style={{ fontSize: '0.85rem', color: '#555', marginTop: 0 }}>
        Add specific claims the subject made — TRACY will cross-reference these against evidence.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Claims to be a customs officer"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={addClaim}>Add</button>
      </div>
      {claims.length > 0 && (
        <ul style={{ marginTop: '0.5rem' }}>
          {claims.map((claim, i) => (
            <li key={i}>
              {claim}{' '}
              <button
                type="button"
                onClick={() => removeClaim(i)}
                style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SubjectClaimsInput;