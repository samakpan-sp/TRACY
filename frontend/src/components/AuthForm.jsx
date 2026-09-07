import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function AuthForm({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
  setError(null);
  const { error: authError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (authError) setError(authError.message);
};

const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authError } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === 'signup' && !data.session) {
      setError('Signup successful — check your email to confirm, then log in.');
      return;
    }

    onAuthSuccess(data.session);
  };

  return (
    <>
        <form onSubmit={handleSubmit} style={{ maxWidth: '300px' }}>
        <h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
        <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
        />
        <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
        <p>
            <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
            >
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
            </button>
        </p>
        </form>

        <hr style={{ margin: '1rem 0' }} />
        <button type="button" onClick={handleGoogleSignIn} style={{ width: '100%' }}>
        Continue with Google
        </button>
    </>

  );

}

export default AuthForm;