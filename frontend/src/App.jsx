import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import AuthForm from './components/AuthForm';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function App() {
  const [session, setSession] = useState(null);
  const [protectedData, setProtectedData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for an existing session on load
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const callProtectedRoute = async () => {
    setError(null);
    setProtectedData(null);

    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession) {
      setError('No active session.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/protected-ping`, {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setProtectedData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProtectedData(null);
  };

  if (!session) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
        <h1>TRACY</h1>
        <AuthForm onAuthSuccess={setSession} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>TRACY — Authenticated</h1>
      <p>Logged in as: <strong>{session.user.email}</strong></p>
      <button onClick={callProtectedRoute}>Call Protected Route</button>
      <button onClick={handleLogout} style={{ marginLeft: '1rem' }}>Log Out</button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {protectedData && (
        <pre style={{ background: '#eee', padding: '1rem', marginTop: '1rem' }}>
          {JSON.stringify(protectedData, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default App;