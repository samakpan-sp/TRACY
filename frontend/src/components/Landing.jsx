import { useState } from 'react';
import InvestigationUniverse from './InvestigationUniverse';
import AuthForm from './AuthForm';


function Landing({ onAuthSuccess }) {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="landing">
      <div className="landing__hero">
        <div className="landing__scene">
          <InvestigationUniverse />
        </div>

        <div className="landing__content">
          <span className="landing__wordmark">TRACY</span>
          <p className="landing__tagline">
            An AI-powered investigation assistant that helps people assess
            whether something they encounter online deserves further trust
            or caution.
          </p>

          {showAuth ? (
            <div className="landing__auth">
              <AuthForm onAuthSuccess={onAuthSuccess} />
            </div>
          ) : (
            <button className="landing__cta" onClick={() => setShowAuth(true)}>
              Sign in to get started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Landing;