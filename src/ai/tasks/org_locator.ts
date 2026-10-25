/**
 * TASK: org_locator — "where does this feature live?"
 * =====================================================================
 * Data source: ai/locator.ts — the static feature map traced to
 * MODULE_CATALOG + the nested features (Bahi-Khata, Practice Mode,
 * Access Review, Approvals panel, Published Accounts, Festival
 * Journey, voice entry) + solo-shell controls + the Ask-AI page.
 *
 * Outcomes:
 *  - 'answer' + openDesk action: org session, the caller may open
 *    the desk (locator.canOpenEntry — the ONE visibility layer fed
 *    the caller's real role + desk scope). The sheet dispatches the
 *    app's own 'sanatani:navigate' desk event — the same routing
 *    FestivalJourneyCard uses.
 *  - 'answer' + navigate action: solo/public features (real route),
 *    or org features asked from a SOLO session (route to /app/orgs,
 *    corpus-style).
 *  - 'answer', NO action: the feature is outside the caller's
 *    scope — the text names the place and the roles that use it.
 *    Never a deep-link into a desk the app would refuse.
 *  - 'clarify': the name matches 2+ features (ONE question listing
 *    the candidates), or nothing matched (honest dontKnow).
 *
 * The router's slot is informational only — the executor re-matches
 * from the raw input so ambiguity is decided on the full candidate
 * list, exactly like tasks/navigation.ts re-matches its corpus.
 */
import {
  canOpenEntry,
  isLocatable,
  locatorFrames,
  locatorTakeMeLabel,
  matchLocator,
  type LocatorEntry,
  type LocatorLang,
} from '../locator';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

function langOf(ctx: TaskCtx): LocatorLang {
  return ctx.lang === 'hi' || ctx.lang === 'bn' ? ctx.lang : 'en';
}

function headed(entry: LocatorEntry, lang: LocatorLang): string {
  return `🙏 **${entry.name[lang]}** ${entry.place[lang]}.`;
}

export function orgLocatorTask(ctx: TaskCtx): TaskOutcome {
  // Catalogue fragments (name/place/usedBy) stay on the en/hi/bn
  // TriText pick; the sentence FRAMES and the take-me label resolve in
  // the asker's full language via the B2-C overlays (locatorFrames).
  const lang = langOf(ctx);
  const frames = locatorFrames(ctx.lang);
  const takeMe = locatorTakeMeLabel(ctx.lang);
  const suggestions = suggestionsFor('org_locator', ctx.lang);
  const m = matchLocator(ctx.input);

  // Ambiguity law first: one question, the candidates listed with
  // where each lives — the user picks; the locator never guesses.
  if (m.best && m.ambiguous.length >= 2) {
    const lines = m.ambiguous.map(
      (e) => `• **${e.name[lang]}** — ${e.place[lang]}.`
    );
    return {
      params: {
        answer: `${frames.clarifyIntro}\n${lines.join('\n')}`,
      },
      variant: 'clarify',
      suggestions,
    };
  }

  // Nothing taught for this name — warm honesty, never a guess.
  if (!isLocatable(m) || !m.best) {
    return {
      params: { answer: frames.dontKnow },
      variant: 'clarify',
      suggestions,
    };
  }

  const entry = m.best;
  const scope = ctx.org?.scope;

  // Solo-shell / public surfaces: the caller's own — always a real
  // route, in either shell.
  if (entry.kind === 'solo' || entry.kind === 'public') {
    return {
      params: { answer: headed(entry, lang) },
      variant: 'answer',
      action: entry.route
        ? { kind: 'navigate', target: entry.route, label: takeMe }
        : undefined,
      suggestions,
    };
  }

  // Org desk / nested feature, asked from inside the org.
  if (scope) {
    if (canOpenEntry(entry, scope)) {
      return {
        params: { answer: headed(entry, lang) },
        variant: 'answer',
        action: entry.deskId
          ? { kind: 'openDesk', target: entry.deskId, label: takeMe }
          : undefined,
        suggestions,
      };
    }
    // Outside the caller's scope: name the place and whose desk it
    // is — kindly, and with NO deep-link (RBAC honesty law).
    return {
      params: {
        answer: `${headed(entry, lang)} ${frames.outOfScope(entry.usedBy[lang])}`,
      },
      variant: 'answer',
      suggestions,
    };
  }

  // Org feature asked from a solo session: the corpus-style path in.
  return {
    params: {
      answer: `${headed(entry, lang)} ${frames.viaOrgsSuffix}`,
    },
    variant: 'answer',
    action: { kind: 'navigate', target: '/app/orgs', label: takeMe },
    suggestions,
  };
}
