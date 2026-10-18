# Translation Reviewer Guidelines — Sanatani Bandhan

> For the native speaker reviewing our translations. Short, practical, warm.

## What you're reviewing

Some of our guide strings (the little tour bubbles that teach a feature)
were first written with AI help. They read fine in English, but they may
sound awkward — or just *off* — in your language. Your job: make them sound
like something a kind elder would actually say.

**The strings under review:** GodMode → **Translations** tab → *Quality*
shows every draft namespace (`guide.devotional`, `guide.vda`,
`guide.sevacards`) per language, with a progress bar.

## Tone law (non-negotiable)

- **Warm, plain words.** Write like you speak to family — never corporate.
- **Devotional dignity.** This is a spiritual companion, not a SaaS product.
- **Short.** Guide steps are 2–3 sentences max. If a sentence needs a
  second breath, split it.
- **No exclamation spam.** One 🙏 per step is plenty.

## What NEVER gets translated

1. **Tier A sacred terms** — ॐ, Aarti, Prasad, Mantra, Havan, Yajna, Shloka,
   Stotra, Bhajan, Kirtan, Sankalp, Tithi, Nakshatra, Panchang, Gau Mata,
   Tulsi… they stay in their canonical form in *every* language.
2. **SAN-XXXXXX IDs and `name@scope` aliases** — identifiers, not words.
3. **Deity names and mantra phrases** — proper nouns.
4. **Tier B domain terms keep their Sanskrit root in your script** —
   *dakshina* is never "fee", *seva* is never "service", *yajman* is never
   "client", *ashirvad* is never "rating". (The editor shows the full
   forbidden-word list beside each field.)

The GodMode editor shows glossary hints next to every field — approved
starter renderings for words like "donation", "blessing", "goal". Confirm
or correct them; they're a starting point, not law.

## How to review (two ways)

**In the app (fastest):** GodMode → Translations → *Editor* → pick your
language and namespace → rewrite any field → **Save overrides**. It goes
live for all users immediately — no app update needed. Fields you changed
get a ✏️ *customized* badge.

**As a file (for careful work):** *Export / Import* → Export JSON → edit
the file at leisure → paste it back → **Validate & apply**. Unknown keys
are rejected automatically, so you can't break anything.

## The quality loop

1. You (or a devotee tapping *"🙏 Help us say this better"* in the app)
   suggest better wording.
2. The owner approves it in the *Suggestions* queue.
3. It ships instantly as a runtime override — the next app open shows it.
4. When a whole namespace reads naturally, tell the owner — it graduates
   from **draft** to **verified** and the "help us say this better" link
   retires for those strings.

## One rule of thumb

Read your translation aloud. If it sounds like a temple volunteer
explaining something with a smile, it's right. If it sounds like a manual,
rewrite it.

*Dhanyavaad for lending your language to the sangam.* 🙏
