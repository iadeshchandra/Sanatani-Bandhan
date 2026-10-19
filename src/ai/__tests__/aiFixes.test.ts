/**
 * Audit Fix #6 — dead AI actions + crisis false positive.
 * Tests for: crisis procedural guard, dana target, dharma route,
 * formatAssistantText, DESTINATION_MAP, suggestion chip routing.
 */
import { detectCrisis, isProceduralHelp } from '../crisisKeywords';
import { formatAssistantText, renderTemplate, suggestionsFor } from '../templates';
import { detectDestination } from '../intents';

describe('isProceduralHelp', () => {
  it('detects procedural "help me" requests', () => {
    expect(isProceduralHelp('help me with dana')).toBe(true);
    expect(isProceduralHelp('help me find a temple')).toBe(true);
    expect(isProceduralHelp('help me book a purohit')).toBe(true);
    expect(isProceduralHelp('HELP ME WITH DANA')).toBe(true);
  });
  it('does not flag standalone distress', () => {
    expect(isProceduralHelp('help me')).toBe(false);
    expect(isProceduralHelp('help me, I am in danger')).toBe(false);
    expect(isProceduralHelp('save me')).toBe(false);
  });
});

describe('detectCrisis — false positive fix', () => {
  it('"help me with dana" is NOT a crisis', () => {
    expect(detectCrisis('help me with dana')).toBeNull();
  });
  it('"help me find a temple" is NOT a crisis', () => {
    expect(detectCrisis('help me find a temple')).toBeNull();
  });
  it('standalone "help me" IS still a crisis', () => {
    expect(detectCrisis('help me')).toBeTruthy();
  });
  it('"help me, I am in danger" IS still a crisis', () => {
    const r = detectCrisis('help me, I am in danger');
    expect(r).toBeTruthy();
    // Either keyword is fine — the point is it fires, not which one matched.
    expect(['help me', 'in danger']).toContain(r!.keyword);
  });
  it('strong keywords still fire regardless', () => {
    expect(detectCrisis('I want to kill myself')).toBeTruthy();
    expect(detectCrisis('this is an emergency')).toBeTruthy();
    expect(detectCrisis('मुझे बचाओ')).toBeTruthy();
  });
});

describe('formatAssistantText', () => {
  it('converts literal \\n to real newlines', () => {
    expect(formatAssistantText('a\\nb')).toBe('a\nb');
  });
  it('strips ** markers', () => {
    expect(formatAssistantText('**bold** text')).toBe('bold text');
  });
  it('handles both together', () => {
    expect(formatAssistantText('**Hi**\\n\\nbye')).toBe('Hi\n\nbye');
  });
  it('leaves clean text untouched', () => {
    expect(formatAssistantText('plain text')).toBe('plain text');
  });
});

describe('renderTemplate applies formatting', () => {
  it('output has no literal \\n or **', () => {
    const out = renderTemplate('voice_upgrade', 'en', { size: '1.7 GB' });
    expect(out).not.toContain('\\n');
    expect(out).not.toContain('**');
    expect(out).toContain('\n');
  });
});

describe('DESTINATION_MAP covers new surfaces', () => {
  it('routes sangam/watch/shorts/chat/wallet', () => {
    expect(detectDestination('open sangam')?.path).toBe('/app/home');
    expect(detectDestination('where are my chats')?.path).toBe('/app/chat');
    expect(detectDestination('open my wallet')?.path).toBe('/app/profile');
    expect(detectDestination('show me shorts')?.path).toBe('/app/home');
  });
});

describe('suggestion chips route to real intents', () => {
  it('dana_help chips are routable', () => {
    const chips = suggestionsFor('dana_help', 'en');
    expect(chips).not.toContain('What is punya ledger?');
    expect(chips).toContain('How do I give dana?');
  });
  it('voice_upgrade chips are routable', () => {
    const chips = suggestionsFor('voice_upgrade', 'en');
    expect(chips).not.toContain('Where is the voice setting?');
    expect(chips).toContain('Download the AI voice');
  });
});
