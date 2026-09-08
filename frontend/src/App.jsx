import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import AuthForm from './components/AuthForm';
import InvestigationForm from './components/InvestigationForm';
import ReportView from './components/ReportView';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);

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

      {report ? (
        <ReportView report={report} onNewInvestigation={() => setReport(null)} />
      ) : (
        <InvestigationForm onReportReceived={setReport} />
      )}
    </div>
  );
}

export default App;