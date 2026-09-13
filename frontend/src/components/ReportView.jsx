import jsPDF from 'jspdf';

function Section({ title, children, accent }) {
  return (
    <div className={`card ${accent ? `card--accent-${accent}` : ''}`}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function generatePdf(report) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  function addLine(text, options = {}) {
    const { size = 11, bold = false, gap = 7 } = options;
    doc.setFontSize(size);
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += gap;
    });
  }

  function addSectionTitle(title) {
    y += 3;
    addLine(title, { size: 13, bold: true, gap: 8 });
  }

  addLine('TRACY Investigation Report', { size: 16, bold: true, gap: 10 });
  addLine(`Generated: ${new Date().toLocaleString()}`, { size: 9, gap: 8 });

  addSectionTitle('Subject');
  addLine(
    `${report.subject_type}${report.subject_platform ? ` (${report.subject_platform})` : ''} — ${report.subject_value}`
  );

  if (report.evidence?.length > 0) {
    addSectionTitle(`Evidence Submitted (${report.evidence.length})`);
    report.evidence.forEach((e) => addLine(`• [${e.type}] ${e.content || e.file_name}`));
  }

  addSectionTitle('Verified Facts');
  if (!report.verified_facts?.length) addLine('None found.');
  report.verified_facts?.forEach((f) => addLine(`• ${f.fact} (source: ${f.source})`));

  addSectionTitle('User-Provided Claims');
  report.user_claims?.forEach((c) => addLine(`• ${c.claim}`));

  if (report.contradictions?.length > 0) {
    addSectionTitle('Contradictions Detected');
    report.contradictions.forEach((c) =>
      addLine(`• Claim: "${c.subject_claim}" — Conflicts with: ${c.conflicts_with}. ${c.explanation}`)
    );
  }

  addSectionTitle('Possible Connections');
  report.possible_connections?.forEach((c) => addLine(`• ${c.connection} — ${c.reasoning}`));

  addSectionTitle('Risk Indicators');
  report.risk_indicators?.forEach((r) => addLine(`• ${r.indicator} — ${r.reasoning}`));

  addSectionTitle('Unknown Information');
  report.unknown_flags?.forEach((u) => addLine(`• ${u}`));

  addSectionTitle('Confidence Level');
  addLine(`${report.confidence_level?.level?.toUpperCase()} — ${report.confidence_level?.justification}`);

  addSectionTitle('Recommended Next Steps');
  report.recommended_next_steps?.forEach((s) => addLine(`• ${s}`));

  const safeSubject = (report.subject_value || 'investigation').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  doc.save(`tracy-${safeSubject}-${Date.now()}.pdf`);
}

function ReportView({ report, onNewInvestigation }) {
  if (!report) return null;

  const level = report.confidence_level?.level || 'low';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Investigation Report</h2>
        <button className="btn btn--primary" onClick={() => generatePdf(report)}>Download PDF</button>
      </div>

      <p style={{ color: 'var(--color-text-muted)' }}>
        Investigating: <strong style={{ color: 'var(--color-text)' }}>{report.subject_type}</strong>
        {report.subject_platform && ` (${report.subject_platform})`} — {report.subject_value}
        {report.evidence?.length > 0 && ` · ${report.evidence.length} evidence item(s)`}
      </p>

      <Section title="✅ Verified Facts" accent="trust">
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

      {report.contradictions?.length > 0 && (
        <Section title="🚨 Contradictions Detected" accent="risk">
          <ul>
            {report.contradictions.map((c, i) => (
              <li key={i}>
                <strong>Claim:</strong> "{c.subject_claim}"<br />
                <strong>Conflicts with:</strong> {c.conflicts_with}<br />
                <small>{c.explanation}</small>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="🔗 Possible Connections">
        <ul>
          {report.possible_connections.map((c, i) => (
            <li key={i}>{c.connection} <br /><small>{c.reasoning}</small></li>
          ))}
        </ul>
      </Section>

      <Section title="⚠️ Risk Indicators" accent="risk">
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
        <span className={`badge badge--${level}`}>{level.toUpperCase()}</span>
        <p style={{ marginTop: '0.6rem' }}>{report.confidence_level.justification}</p>
      </Section>

      <Section title="➡️ Recommended Next Steps">
        <ul>
          {report.recommended_next_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </Section>

      <button className="btn btn--secondary" onClick={onNewInvestigation}>Start New Investigation</button>
    </div>
  );
}

export default ReportView;