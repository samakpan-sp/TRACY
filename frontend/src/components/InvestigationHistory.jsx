import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ReportView from './ReportView';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function InvestigationHistory({ onBack }) {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in.');

      const res = await fetch(`${API_BASE}/api/investigations`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setList(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id) {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in.');

      const res = await fetch(`${API_BASE}/api/investigations/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setSelected(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ marginBottom: '1rem' }}>
          ← Back to history
        </button>
        <ReportView report={selected} onNewInvestigation={onBack} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Investigation History</h2>
        <button onClick={onBack}>New Investigation</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {list && list.length === 0 && <p>No investigations yet.</p>}

      {list && list.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {list.map((item) => (
            <li
              key={item.id}
              onClick={() => loadDetail(item.id)}
              style={{
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <strong>{item.subject_type}</strong>
              {item.subject_platform && ` (${item.subject_platform})`} — {item.subject_value}
              <br />
              <small>
                Confidence: {item.confidence_level?.level?.toUpperCase() || 'N/A'} ·{' '}
                {new Date(item.created_at).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default InvestigationHistory;