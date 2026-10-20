# Crisis Command — Phase 1 TESTS.md

**Scope:** `src/crisis/{types,crisisStrings,sosService,PanicButton,SituationPicker,SOSConfirm,SOSTimeline,SOSFlow,EmergencyContacts}.ts(x)`
plus the surgical extension of `src/components/common/GlobalSOSListener.tsx`.
No pushes, no `firestore.rules` changes (per task constraints).

## What was verified

### 1. TypeScript — clean on all Phase 1 files
- Ran `npx tsc --noEmit -p tsconfig.json` (full project).
- **Zero errors** in: `types.ts`, `crisisStrings.ts`, `sosService.ts`,
  `PanicButton.tsx`, `SituationPicker.tsx`, `SOSConfirm.tsx`,
  `SOSTimeline.tsx`, `SOSFlow.tsx`, `EmergencyContacts.tsx`,
  `components/common/GlobalSOSListener.tsx`.
- Pre-existing errors in *other* `src/crisis/` files (built concurrently by a
  parallel phase agent — `CrisisGuide.tsx`, `OrgHistory.tsx`,
  `crisisSuchana.ts`, `historyService.ts`) were **not introduced by Phase 1**
  and were left untouched. See the final report for the list.

### 2. Contract conformance (manual review against the shared data contract)
- `crisis_events/{eventId}` carries every contract field with honest nullable
  types: `id, senderUid, senderName, senderPhoto, sanId, bloodGroup,
  situation, details, voiceNoteUrl, location{lat,lng,address,capturedAt},
  medicalShare{allergies,conditions}, status, severity, orgId, workspaceId,
  familyNotified, createdAt, resolvedAt, outcomeNote, ackCount, responderCount`.
- `crisis_events/{eventId}/responses/{uid}`: `uid, name, photo,
  status('coming'|'arrived'), distanceM, createdAt`. ✔
- `emergencyContacts/{uid}`: `{ contacts: [{name, phone, relation}] }`. ✔
- `crisisAbuse/{uid}`: `{ falseCount, windowStart, warned, cooldownUntil }`. ✔
- Severity mapping: medical/robbery→critical, fire/disaster→high,
  crowd/other→medium (`SITUATION_SEVERITY`). ✔
- No `undefined as X` casts anywhere; all Firestore reads use optional
  chaining + `?? null` fallbacks.

### 3. Lifecycle logic (code-path review — no invented runtime results)
- `triggerSOS`: creates the event doc FIRST (status `active`, counters at 0),
  then uploads the voice note; voice upload failure stages the blob in an
  IndexedDB outbox (`crisis_outbox` DB) instead of failing the SOS.
  `flushVoiceOutbox(eventId)` retries on view mount + `online` events.
- `cancelSOS("I'm safe")`: sets `cancelled` + `resolvedAt`, dispatches
  `crisis_sos_cancelled` so every listener stands down; optional
  `wasFalseAlarm` feeds the abuse tracker.
- `ackSOS`: `setDoc(responses/{uid}, …, {merge:true})` (idempotent per uid) +
  atomic `increment(1)` on `ackCount`/`responderCount`, status→`acknowledged`.
- `markArrived` / `resolveSOS` (with optional `outcomeNote`) verified by
  reading the written update payloads.
- `recordFalseAlarm`: rolling 30-day window; ≥3 falses → `warned=true`;
  beyond → soft 24h `cooldownUntil` (UI nudge only — `triggerSOS` never
  blocks). Verified the window-rollover branch by reading the code.
- `captureSOSLocation`: 8s geolocation timeout → last-known fix from
  `localStorage` → nulls. Location is captured **only** at SOS time.

### 4. Offline-first
- Firestore writes ride the app-wide multi-tab IndexedDB persistence
  (`src/lib/firebase.ts`) — writes land locally and sync when online.
- Voice notes (Storage uploads can't use Firestore persistence) use the
  dedicated IndexedDB outbox described above.

### 5. UI requirements (static verification)
- `PanicButton`: 72×72px (≥64), fixed bottom-right, press-and-hold 1500ms
  with SVG progress ring, release-early cancels, `navigator.vibrate` on
  activation, deep amber/maroon radial gradient (no alarming red), trilingual
  label + hint, `aria-label`, visible focus ring, `touch-none`.
- `SituationPicker`: 6 tiles, each `min-h-[88px]` (≥72), ≥44px close button,
  optional details input; "Other" → MediaRecorder voice note
  (`audio/webm` → Storage `sosVoice/{uid}/{eventId}.webm`).
- `SOSConfirm`: who/where/what summary, privacy notice verbatim
  ("Your location is shared ONLY for this SOS. We never track you."),
  big Confirm (flex-2, 56px) + Cancel (44px+), cooldown nudge when applicable,
  error state that never strands the user.
- `SOSTimeline`: 4-step live timeline with timestamps (Sent → Acknowledged(n)
  → Responders coming → Resolved), "N people responding, nearest Xm away",
  responder avatar stack, big "I'm Safe" (60px) with false-alarm-aware
  confirm, resolve path with optional outcome note.
- `EmergencyContacts` + `EmergencyContactsNudge`: add/edit/delete with phone
  validation, warm nudge copy when empty.
- All interactive elements ≥44px; mobile-first bottom-sheet modals.

### 6. GlobalSOSListener surgical extension
- Existing `yatra_broadcasts` RICH_SOS behavior (audio, in-app notification,
  OS push, both alert cards) is byte-for-byte preserved except the
  `return null` guard, which now also considers crisis alerts.
- Added: live `crisis_events` (status=`active`) listener with per-event
  `ackCount`/`responderCount` live updates, severity badge, blood-group chip,
  "I'm coming" quick-action → `ackSOS` → warm confirmation
  ("They know you are on your way. 🙏"). Sender never sees their own SOS.
- Warm amber styling for crisis cards (existing red CODE RED cards untouched).

## NOT verified (needs human / later phases)
- Real GPS fix, real Firestore/Storage round-trips, push-notification
  permission flows, and multi-device ACK propagation — no emulator or device
  run was performed; no results invented.
- `firestore.rules` for `crisis_events`, `emergencyContacts`, `crisisAbuse`
  and Storage `sosVoice/**` do not exist yet (rules author task — see report).
- `sanataniProfiles` `lat`/`lng` fields for the 2km fan-out are best-effort;
  the bounding-box query matches nobody if those fields don't exist.
