import 'dotenv/config';
import { app } from './app';
import { runSlaEscalationSweep } from './lib/sla';

const port = process.env.PORT ?? 4000;
app.listen(port, () => console.log(`API listening on :${port}`));

// The actual "automation" in SLA & Automation: escalate anything that
// missed its resolution target. Lives here (not app.ts) so importing the
// app in tests never spins up a background interval - tests trigger the
// same sweep on demand via POST /api/tickets/sla/run-check instead.
const SLA_SWEEP_INTERVAL_MS = 60_000;
setInterval(() => {
  runSlaEscalationSweep()
    .then(({ checked, escalated }) => {
      if (escalated) console.log(`SLA sweep: escalated ${escalated}/${checked} overdue tickets`);
    })
    .catch((err) => console.error('SLA sweep failed:', err));
}, SLA_SWEEP_INTERVAL_MS);
