/**
 * ContentEditor — App Growth admin: edit /get-app landing copy, no code.
 * =======================================================================
 * Every string is trilingual (en / bn / hi). Saves merge into
 * `appGrowth/config` under `content` — the landing page (Landing builder)
 * reads it via useAppGrowthConfig with hardcoded DEFAULT_CONTENT fallback.
 * The preview below renders the SAME fields, so what the owner sees is
 * what ships (layout may differ slightly from the final page).
 */
import React, { useEffect, useState } from 'react';
import { Save, Eye, Trash2, Plus } from 'lucide-react';
import { useAppGrowthConfig, isOwnerClient, type Tri, type AppGrowthContent } from '../useAppGrowthConfig';
import { useToast } from '../../context/ToastContext';
import { Card, Loading, SectionTitle, Field, inputCls, btnPrimary, btnGhost } from './ui';

const TriField: React.FC<{ label: string; value: Tri; onChange: (v: Tri) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <p className="text-xs font-semibold text-slate-300">{label}</p>
    {(['en', 'bn', 'hi'] as const).map((lang) => (
      <div key={lang} className="flex items-center gap-2">
        <span className="w-8 shrink-0 text-[10px] font-black uppercase text-slate-500">{lang}</span>
        <input
          className={inputCls}
          value={value[lang]}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
          placeholder={lang === 'en' ? 'English' : lang === 'bn' ? 'বাংলা' : 'हिन्दी'}
        />
      </div>
    ))}
  </div>
);

const ListShell: React.FC<{ title: string; children: React.ReactNode; onAdd?: () => void }> = ({ title, children, onAdd }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      {onAdd && (
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs text-saffron-300 hover:underline min-h-[32px]">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      )}
    </div>
    {children}
  </div>
);

const RemoveBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} title="Remove" className="shrink-0 p-2 min-w-[44px] min-h-[44px] text-slate-500 hover:text-red-400">
    <Trash2 className="w-4 h-4" />
  </button>
);

/* ---------- mobile/desktop preview (renders the same content fields) ---------- */
const ContentPreview: React.FC<{ content: AppGrowthContent; mode: 'mobile' | 'desktop' }> = ({ content, mode }) => (
  <div className={`mx-auto rounded-[1.6rem] border-2 border-slate-700 bg-slate-950 p-2 transition-all ${mode === 'mobile' ? 'max-w-[320px]' : 'max-w-[720px]'}`}>
    <div className="rounded-[1.1rem] bg-gradient-to-b from-amber-950/50 to-slate-950 p-4 space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="text-center space-y-1.5">
        <h4 className="text-base font-black text-white">{content.hero.headline.en || '—'}</h4>
        <p className="text-xs text-slate-400">{content.hero.subline.en || '—'}</p>
      </div>
      <div className={`grid gap-2 ${mode === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {content.whyCards.map((c, i) => (
          <div key={i} className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
            <p className="text-xs font-bold text-saffron-300">{c.title.en || '—'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{c.body.en || '—'}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-bold text-white mb-1.5">{content.utilities.title.en}</p>
        <div className="flex flex-wrap gap-1.5">
          {content.utilities.items.map((u, i) => (
            <span key={i} className="text-[11px] rounded-full bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-300">{u.en || '—'}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-white mb-1.5">{content.howItWorks.title.en}</p>
        <ol className="space-y-1">
          {content.howItWorks.steps.map((s, i) => (
            <li key={i} className="text-[11px] text-slate-300 flex gap-2"><span className="text-saffron-400 font-black">{i + 1}.</span> {s.en || '—'}</li>
          ))}
        </ol>
      </div>
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 text-center">
        <p className="text-[11px] italic text-slate-300">“{content.testimonial.quote.en || '—'}”</p>
        <p className="text-[10px] text-slate-500 mt-1">{content.testimonial.name.en} · {content.testimonial.role.en}</p>
      </div>
    </div>
  </div>
);

export const ContentEditor: React.FC = () => {
  const { config, loading, save } = useAppGrowthConfig();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<AppGrowthContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(config.content)) as AppGrowthContent);
  }, [config]);

  if (loading || !draft) return <Loading text="Loading landing content…" />;

  const set = (next: AppGrowthContent) => setDraft(next);
  const updateTriList = <T,>(list: T[], i: number, key: keyof T, v: Tri): T[] =>
    list.map((item, j) => (j === i ? { ...item, [key]: v } : item));

  const handleSave = async () => {
    if (!isOwnerClient()) { showToast('Only the platform owner can save.', 'error'); return; }
    setSaving(true);
    try {
      await save({ content: draft });
      showToast('Landing content saved — /get-app picks it up within a minute.', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <button type="button" className={btnGhost} onClick={() => setPreview(!preview)}>
          <Eye className="w-4 h-4" /> {preview ? 'Hide preview' : 'Preview'}
        </button>
        {preview && (
          <div className="flex rounded-xl border border-slate-700 overflow-hidden">
            {(['mobile', 'desktop'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPreviewMode(m)}
                className={`px-3 py-2 min-h-[44px] text-xs font-bold capitalize ${previewMode === m ? 'bg-saffron-500 text-slate-950' : 'text-slate-300'}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <Card>
          <SectionTitle hint="Content preview — final page layout is owned by the Landing builder.">Live preview</SectionTitle>
          <ContentPreview content={draft} mode={previewMode} />
        </Card>
      )}

      <Card>
        <SectionTitle hint="Top of /get-app.">Hero</SectionTitle>
        <div className="space-y-3">
          <TriField label="Headline" value={draft.hero.headline} onChange={(v) => set({ ...draft, hero: { ...draft.hero, headline: v } })} />
          <TriField label="Subline" value={draft.hero.subline} onChange={(v) => set({ ...draft, hero: { ...draft.hero, subline: v } })} />
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Exactly 4 cards.">Why cards</SectionTitle>
        <ListShell title="Cards">
          {draft.whyCards.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-800 p-3 space-y-2">
              <p className="text-[11px] font-black text-saffron-400">CARD {i + 1}</p>
              <TriField label="Title" value={c.title} onChange={(v) => set({ ...draft, whyCards: updateTriList(draft.whyCards, i, 'title', v) })} />
              <TriField label="Body" value={c.body} onChange={(v) => set({ ...draft, whyCards: updateTriList(draft.whyCards, i, 'body', v) })} />
            </div>
          ))}
        </ListShell>
      </Card>

      <Card>
        <SectionTitle>Utilities</SectionTitle>
        <div className="space-y-3">
          <TriField label="Section title" value={draft.utilities.title} onChange={(v) => set({ ...draft, utilities: { ...draft.utilities, title: v } })} />
          <ListShell title="Utility chips" onAdd={() => set({ ...draft, utilities: { ...draft.utilities, items: [...draft.utilities.items, { en: '', bn: '', hi: '' }] } })}>
            {draft.utilities.items.map((u, i) => (
              <div key={i} className="flex gap-1 items-start">
                <div className="flex-1"><TriField label={`Chip ${i + 1}`} value={u} onChange={(v) => set({ ...draft, utilities: { ...draft.utilities, items: draft.utilities.items.map((x, j) => (j === i ? v : x)) } })} /></div>
                <RemoveBtn onClick={() => set({ ...draft, utilities: { ...draft.utilities, items: draft.utilities.items.filter((_, j) => j !== i) } })} />
              </div>
            ))}
          </ListShell>
        </div>
      </Card>

      <Card>
        <SectionTitle>How it works</SectionTitle>
        <div className="space-y-3">
          <TriField label="Section title" value={draft.howItWorks.title} onChange={(v) => set({ ...draft, howItWorks: { ...draft.howItWorks, title: v } })} />
          <ListShell title="Steps" onAdd={() => set({ ...draft, howItWorks: { ...draft.howItWorks, steps: [...draft.howItWorks.steps, { en: '', bn: '', hi: '' }] } })}>
            {draft.howItWorks.steps.map((s, i) => (
              <div key={i} className="flex gap-1 items-start">
                <div className="flex-1"><TriField label={`Step ${i + 1}`} value={s} onChange={(v) => set({ ...draft, howItWorks: { ...draft.howItWorks, steps: draft.howItWorks.steps.map((x, j) => (j === i ? v : x)) } })} /></div>
                <RemoveBtn onClick={() => set({ ...draft, howItWorks: { ...draft.howItWorks, steps: draft.howItWorks.steps.filter((_, j) => j !== i) } })} />
              </div>
            ))}
          </ListShell>
        </div>
      </Card>

      <Card>
        <SectionTitle>Benefits by role</SectionTitle>
        <div className="space-y-3">
          <TriField label="Section title" value={draft.benefits.title} onChange={(v) => set({ ...draft, benefits: { ...draft.benefits, title: v } })} />
          <ListShell title="Role tabs" onAdd={() => set({ ...draft, benefits: { ...draft.benefits, tabs: [...draft.benefits.tabs, { role: { en: '', bn: '', hi: '' }, points: [] }] } })}>
            {draft.benefits.tabs.map((t, i) => (
              <div key={i} className="rounded-xl border border-slate-800 p-3 space-y-2">
                <div className="flex gap-1 items-start">
                  <div className="flex-1"><TriField label={`Role ${i + 1}`} value={t.role} onChange={(v) => set({ ...draft, benefits: { ...draft.benefits, tabs: draft.benefits.tabs.map((x, j) => (j === i ? { ...x, role: v } : x)) } })} /></div>
                  <RemoveBtn onClick={() => set({ ...draft, benefits: { ...draft.benefits, tabs: draft.benefits.tabs.filter((_, j) => j !== i) } })} />
                </div>
                {t.points.map((p, k) => (
                  <div key={k} className="flex gap-1 items-start pl-3">
                    <div className="flex-1"><TriField label={`Point ${k + 1}`} value={p} onChange={(v) => set({ ...draft, benefits: { ...draft.benefits, tabs: draft.benefits.tabs.map((x, j) => (j === i ? { ...x, points: x.points.map((y, m) => (m === k ? v : y)) } : x)) } })} /></div>
                    <RemoveBtn onClick={() => set({ ...draft, benefits: { ...draft.benefits, tabs: draft.benefits.tabs.map((x, j) => (j === i ? { ...x, points: x.points.filter((_, m) => m !== k) } : x)) } })} />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set({ ...draft, benefits: { ...draft.benefits, tabs: draft.benefits.tabs.map((x, j) => (j === i ? { ...x, points: [...x.points, { en: '', bn: '', hi: '' }] } : x)) } })}
                  className="ml-3 inline-flex items-center gap-1 text-xs text-saffron-300 hover:underline min-h-[32px]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add point
                </button>
              </div>
            ))}
          </ListShell>
        </div>
      </Card>

      <Card>
        <SectionTitle>FAQ</SectionTitle>
        <div className="space-y-3">
          <TriField label="Section title" value={draft.faq.title} onChange={(v) => set({ ...draft, faq: { ...draft.faq, title: v } })} />
          <ListShell title="Questions" onAdd={() => set({ ...draft, faq: { ...draft.faq, items: [...draft.faq.items, { q: { en: '', bn: '', hi: '' }, a: { en: '', bn: '', hi: '' } }] } })}>
            {draft.faq.items.map((f, i) => (
              <div key={i} className="rounded-xl border border-slate-800 p-3 space-y-2">
                <div className="flex gap-1 items-start">
                  <div className="flex-1 space-y-2">
                    <TriField label={`Question ${i + 1}`} value={f.q} onChange={(v) => set({ ...draft, faq: { ...draft.faq, items: draft.faq.items.map((x, j) => (j === i ? { ...x, q: v } : x)) } })} />
                    <TriField label="Answer" value={f.a} onChange={(v) => set({ ...draft, faq: { ...draft.faq, items: draft.faq.items.map((x, j) => (j === i ? { ...x, a: v } : x)) } })} />
                  </div>
                  <RemoveBtn onClick={() => set({ ...draft, faq: { ...draft.faq, items: draft.faq.items.filter((_, j) => j !== i) } })} />
                </div>
              </div>
            ))}
          </ListShell>
        </div>
      </Card>

      <Card>
        <SectionTitle>Testimonial</SectionTitle>
        <div className="space-y-3">
          <TriField label="Quote" value={draft.testimonial.quote} onChange={(v) => set({ ...draft, testimonial: { ...draft.testimonial, quote: v } })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <TriField label="Name" value={draft.testimonial.name} onChange={(v) => set({ ...draft, testimonial: { ...draft.testimonial, name: v } })} />
            <TriField label="Role / attribution" value={draft.testimonial.role} onChange={(v) => set({ ...draft, testimonial: { ...draft.testimonial, role: v } })} />
          </div>
          <p className="text-[11px] text-slate-500">Use a real temple name + quote before pitching to buyers — placeholders do not survive contact with customers.</p>
        </div>
      </Card>

      <div className="sticky bottom-0 pb-1">
        <button type="button" className={`${btnPrimary} w-full`} disabled={saving} onClick={handleSave}>
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save landing content'}
        </button>
      </div>
    </div>
  );
};
