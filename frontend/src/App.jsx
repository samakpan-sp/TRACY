import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import AuthForm from './components/AuthForm';
import InvestigationForm from './components/InvestigationForm';
import ReportView from './components/ReportView';
import ErrorBoundary from './components/ErrorBoundary';
import InvestigationHistory from './components/InvestigationHistory';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [view, setView] = useState('new'); // 'new' | 'history'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setReport(null);
    setView('new');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '600px' }}>
        <h1>TRACY</h1>
        <button onClick={handleLogout}>Log Out</button>
      </div>
      <p>Logged in as: <strong>{session.user.email}</strong></p>

      {view === 'history' ? (
        <ErrorBoundary>
          <InvestigationHistory onBack={() => { setView('new'); setReport(null); }} />
        </ErrorBoundary>
      ) : report ? (
        <ErrorBoundary>
          <ReportView report={report} onNewInvestigation={() => setReport(null)} />
        </ErrorBoundary>
      ) : (
        <div>
          <button onClick={() => setView('history')} style={{ marginBottom: '1rem' }}>
            View History
          </button>
          <InvestigationForm onReportReceived={setReport} />
        </div>
      )}
    </div>
  );
}

export default App;