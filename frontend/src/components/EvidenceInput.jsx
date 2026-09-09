import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const isFileType = draftType === 'screenshot' || draftType === 'video';

  const addEvidence = async () => {
    setUploadError(null);

    if (isFileType) {
      if (!draftFile) return;
      setUploading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('You must be logged in.');

        const formData = new FormData();
        formData.append('file', draftFile);
        formData.append('evidence_type', draftType);

        const res = await fetch(`${API_BASE}/api/evidence-upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Upload failed (${res.status})`);
        }

        const result = await res.json();

        setEvidence([
          ...evidence,
          {
            type: draftType,
            file_name: result.file_name,
            storage_path: result.storage_path,
            ocr_text: result.ocr_text || null,
          },
        ]);
        setDraftFile(null);
      } catch (err) {
        setUploadError(err.message);
      } finally {
        setUploading(false);
      }
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

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <select
          value={draftType}
          onChange={(e) => { setDraftType(e.target.value); setDraftText(''); setDraftFile(null); setUploadError(null); }}
        >
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

        <button type="button" onClick={addEvidence} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Add'}
        </button>
      </div>

      {draftType === 'video' && (
        <p style={{ fontSize: '0.8rem', color: '#777', margin: '0 0 0.5rem' }}>
          Max 40MB (~1 minute). Trim longer clips to the relevant portion.
        </p>
      )}
      {draftType === 'screenshot' && (
        <p style={{ fontSize: '0.8rem', color: '#777', margin: '0 0 0.5rem' }}>
          Max 10MB.
        </p>
      )}

      {uploadError && <p style={{ color: 'red', fontSize: '0.85rem' }}>{uploadError}</p>}

      {evidence.length > 0 && (
        <ul>
          {evidence.map((item, i) => (
            <li key={i}>
              <strong>{item.type}:</strong>{' '}
              {item.content || item.file_name}
              {item.type === 'screenshot' && item.ocr_text && (
                <span style={{ color: '#555', fontStyle: 'italic' }}> — OCR: "{item.ocr_text.slice(0, 60)}{item.ocr_text.length > 60 ? '...' : ''}"</span>
              )}
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