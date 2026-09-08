import { useState } from 'react';

const EVIDENCE_TYPES = [
  { value: 'message', label: 'Message' },
  { value: 'url', label: 'URL' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'video', label: 'Video' },
];

function EvidenceInput({ evidence, setEvidence }) {
  const [draftType, setDraftType] = useState('message');
  const [draftText, setDraftText] = useState('');
  const [draftFile, setDraftFile] = useState(null);

  const isFileType = draftType === 'screenshot' || draftType === 'video';

  const addEvidence = () => {
    if (isFileType) {
      if (!draftFile) return;
      setEvidence([
        ...evidence,
        {
          type: draftType,
          // Real upload lands in Milestone 5/6 — for now we capture metadata only.
          file_name: draftFile.name,
          file_size: draftFile.size,
          file_mime: draftFile.type,
          uploaded: false,
        },
      ]);
      setDraftFile(null);
    } else {
      const trimmed = draftText.trim();
      if (trimmed.length === 0) return;
      setEvidence([...evidence, { type: draftType, content: trimmed }]);
      setDraftText('');
    }
  };

  const removeEvidence = (index) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
        Details
      </label>
      <p style={{ fontSize: '0.85rem', color: '#555', marginTop: 0 }}>
        Add messages, screenshots, video evidence, or a URL — this is what TRACY analyzes to support its report.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <select value={draftType} onChange={(e) => { setDraftType(e.target.value); setDraftText(''); setDraftFile(null); }}>
          {EVIDENCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {isFileType ? (
          <input
            type="file"
            accept={draftType === 'video' ? 'video/*' : 'image/*'}
            onChange={(e) => setDraftFile(e.target.files[0] || null)}
            style={{ flex: 1 }}
          />
        ) : (
          <input
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={draftType === 'url' ? 'https://...' : 'Paste the message text'}
            style={{ flex: 1 }}
          />
        )}

        <button type="button" onClick={addEvidence}>Add</button>
      </div>

      {evidence.length > 0 && (
        <ul>
          {evidence.map((item, i) => (
            <li key={i}>
              <strong>{item.type}:</strong>{' '}
              {item.content || item.file_name}
              {' '}
              <button
                type="button"
                onClick={() => removeEvidence(i)}
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

export default EvidenceInput;