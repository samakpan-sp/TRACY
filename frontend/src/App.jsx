import { useState, useEffect } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => setHealth(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>TRACY — Foundation Check</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!error && !health && <p>Connecting to backend...</p>}
      {health && (
        <div>
          <p>Status: <strong>{health.status}</strong></p>
          <p>Service: {health.service}</p>
          <p>Checked at: {health.timestamp}</p>
        </div>
      )}
    </div>
  );
}

export default App;