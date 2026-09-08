function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '6px' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

function ReportView({ report, onNewInvestigation }) {
  if (!report) return null;

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2>Investigation Report</h2>
      <p><em>
        Investigating: {report.subject_type}
        {report.subject_platform && ` (${report.subject_platform})`} — {report.subject_value}
      </em></p>

      {report.evidence?.length > 0 && (
        <p><em>Evidence attached: {report.evidence.length} item(s)</em></p>
      )}

      <Section title="✅ Verified Facts">
        {report.verified_facts.length === 0 ? (
          <p>None found.</p>
        ) : (
          <ul>
            {report.verified_facts.map((f, i) => (
              <li key={i}>{f.fact} <small>(source: {f.source})</small></li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="🗣️ User-Provided Claims">
        <ul>
          {report.user_claims.map((c, i) => <li key={i}>{c.claim}</li>)}
        </ul>
      </Section>

      <Section title="🔗 Possible Connections">
        <ul>
          {report.possible_connections.map((c, i) => (
            <li key={i}>{c.connection} <br /><small>{c.reasoning}</small></li>
          ))}
        </ul>
      </Section>

      <Section title="⚠️ Risk Indicators">
        <ul>
          {report.risk_indicators.map((r, i) => (
            <li key={i}>{r.indicator} <br /><small>{r.reasoning}</small></li>
          ))}
        </ul>
      </Section>

      <Section title="❓ Unknown Information">
        <ul>
          {report.unknown_flags.map((u, i) => <li key={i}>{u}</li>)}
        </ul>
      </Section>

      <Section title="📊 Confidence Level">
        <p><strong>{report.confidence_level.level.toUpperCase()}</strong></p>
        <p>{report.confidence_level.justification}</p>
      </Section>

      <Section title="➡️ Recommended Next Steps">
        <ul>
          {report.recommended_next_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </Section>

      <button onClick={onNewInvestigation}>Start New Investigation</button>
    </div>
  );
}

export default ReportView;