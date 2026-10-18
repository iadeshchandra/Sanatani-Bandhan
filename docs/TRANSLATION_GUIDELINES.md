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

## Regional vocabulary — the same warmth, the local music

Language alone isn't enough: a Tamil devotee's temple is a **kovil**,
never a "mandir" wearing Tamil script. So community words also follow
the devotee's **region** — suggested warmly once from device locale,
phone code or IP, always changeable, and never overriding the devotee's
own explicit choice.

**The 15 regions** (each with its default language):
- Tamil Nadu (ta) — கோவில் · தீபாவளி · வணக்கம்
- Karnataka (kn) — ದೇವಸ್ಥಾನ · ದೀಪಾವಳಿ · ನಮಸ್ಕಾರ
- Andhra / Telangana (te) — దేవస్థానం · దీపావళి · నమస్కారం
- Kerala (ml) — ക്ഷേത്രം · ദീപാവലി · നമസ്കാരം
- Maharashtra (mr) — मंदिर · दिवाळी · नमस्कार
- Gujarat (gu) — મંદિર · દિવાળી · નમસ્તે
- West Bengal (bn) — মন্দির · দীপাবলি · নমস্কার
- Bangladesh (bn) — মন্দির · দীপাবলি · নমস্কার
- Hindi belt (hi) — मंदिर · दिवाली · नमस्ते
- Punjab (hi) — मंदिर · दिवाली · नमस्ते
- Odisha (hi) — मंदिर · दिवाली · नमस्ते
- Assam (bn) — মন্দির · দীপাবলি · নমস্কার
- Northeast (en) — temple · Diwali · hello
- Global diaspora (en) — your language, your words
- Other (en) — temple · Diwali · hello

**Terms that vary by region (10):** temple (*kovil* in Tamil Nadu),
priest (*archakar* in TN, *shanti* in Kerala), festivalOfLights
(*Deepavali* in the south, *Diwali* in the north), offering (*kanikkai*
in TN, *pronami* in Bengal), blessing (*ashirvadam* in the south),
devotee (*bhaktar* in TN), deity (*Deivam* in TN, *Thakur* in Bengal),
greeting (*Vanakkam* in TN), worshipRite (*archanai* in TN, *puja* in
the north), honorific (*Thiru* in TN, *Shri* elsewhere). Note the
English-UI case too: a devotee reading English in Tamil Nadu sees
"kovil", not "temple" — check that the transliteration feels right, not
just the native script.

**Terms that NEVER vary** — sacred things don't localize: prasad,
mantra, shloka, stotra, bhajan, kirtan, aarti, dharma, karma, punya,
seva, tithi, panchang, havan, yajna. A jest test guards this list; if
you feel a word belongs on it, say so — that's a design decision, not a
translation.

**How to propose a new regional term, or fix one:**
1. In the app, tap *"🙏 Help us say this better"* on the draft term —
   your suggestion lands in GodMode → Translations → *Suggestions*.
2. The owner approves → it ships instantly as a runtime override, no
   app update. (GodMode → Translations → regional editor is the planned
   home for direct term editing; until it lands, the suggestion flow
   above is the way in.)
3. Developers add the key to `REGIONAL_TERMS` in
   `src/i18n/regionalTerms.ts` with its regional variants and language
   defaults, marked `high`/`medium` confidence.

**The read-aloud rule, per region:** read the word aloud in the
region's voice — the way your grandmother would say it at the temple
gate. If it sounds like a textbook, it isn't done; suggest the word
your community actually uses.

**The draft safety net:** every regional term in Sanskrit, Tamil,
Telugu, Marathi, Gujarati, Kannada and Malayalam ships as **draft**
(70 draft entries) until a native speaker verifies it — English, Hindi
and Bengali are verified. Draft terms carry the "help us say this
better" link; verified terms retire it. Nothing regional ever goes live
unreviewed without that affordance beside it.

*Dhanyavaad for lending your language to the sangam.* 🙏
