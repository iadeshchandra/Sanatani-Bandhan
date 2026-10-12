// Local-dev shim: runs the same Express app that ships as the Cloud Function.
// The canonical app lives in functions/src/app.ts; this file only binds a port.
import 'dotenv/config';
import appImport from '../functions/src/app';

// Defensive unwrap: functions/ has no "type": "module", so under tsx the
// app module loads as CJS and the ESM default import arrives double-wrapped
// as { default: <express app> }. Works in both shapes.
const app: any = (appImport as any)?.default ?? appImport;

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Sanatani Bandhan API] Local dev server listening on port ${PORT}`);
});

export default app;
