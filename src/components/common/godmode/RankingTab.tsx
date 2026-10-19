/**
 * godmode/RankingTab.tsx — GodMode ranking weight tuner.
 * ====================================================================
 * Sliders for every feed + marketplace weight. Changes apply immediately
 * (Firestore platformConfig/ranking, cached locally for 5 min).
 * "Test with sample data" shows how weight changes affect sample rankings.
 *
 * Design: dark sovereign console, saffron accents. Every mutation audit-logged.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, RotateCcw, FlaskConical, Save, RefreshCw } from 'lucide-react';
import {
  DEFAULT_FEED_WEIGHTS,
  type FeedWeights,
} from '../../../ranking/feed';
import {
  rankFeed,
  explainFeedScore,
  emptyUserSignals,
  type ScoredPost,
} from '../../../ranking/feed';
import {
  DEFAULT_MARKETPLACE_WEIGHTS,
  rankProviders,
  explainScore,
  emptyProviderStats,
  type MarketplaceWeights,
  type RankableProvider,
  type ProviderStats,
  type ScoredProvider,
} from '../../../ranking/marketplace';
import {
  loadRankingConfig,
  saveRankingConfig,
  type RankingConfig,
} from '../../../ranking/storage';
import type { SangamPost } from '../../../sangam/types';
import { useToast } from '../../../context/ToastContext';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>{children}</div>
);

const Loading: React.FC = () => (
  <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading ranking config…
  </div>
);

/* Slider row for a single weight */
const WeightSlider: React.FC<{
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, hint, value, onChange }) => (
  <div className="py-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-slate-200">{label}</span>
      <span className="text-sm font-mono text-amber-400">{Math.round(value * 100)}%</span>
    </div>
    <input
      type="range" min={0} max={1} step={0.05} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 accent-amber-500 min-h-[44px]"
      aria-label={label}
    />
    <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
  </div>
);

/* ------------------------------------------------------------------ */
/* Sample data for the preview tester                                   */
/* ------------------------------------------------------------------ */

const NOW = Date.now();
const HOUR = 3_600_000;

function samplePosts(): SangamPost[] {
  const base: SangamPost = {
    id: '', authorUid: '', authorName: '', authorSanId: 'SAN-XXXXXX',
    authorKind: 'devotee', isOfficialPagePost: false, kind: 'text', text: '',
    createdAt: NOW, ashirvadCount: 0, commentCount: 0, shareCount: 0,
    visibility: 'public', status: 'active',
  };
  return [
    { ...base, id: 's1', authorUid: 'u1', authorName: 'Meera', text: 'Morning aarti bliss 🪔', createdAt: NOW - HOUR, ashirvadCount: 45, commentCount: 12, shareCount: 3 },
    { ...base, id: 's2', authorUid: 'u2', authorName: 'Arjun', text: 'Just an old photo', createdAt: NOW - 30 * HOUR, ashirvadCount: 2 },
    { ...base, id: 's3', authorUid: 'u3', authorName: 'Temple Trust', authorKind: 'org', isOfficialPagePost: true, kind: 'event', text: 'Diwali Mahotsav — all welcome!', createdAt: NOW - 3 * HOUR, ashirvadCount: 120, commentCount: 30, shareCount: 25 },
    { ...base, id: 's4', authorUid: 'u1', authorName: 'Meera', text: 'Evening bhajan', createdAt: NOW - 2 * HOUR, ashirvadCount: 20, commentCount: 5 },
    { ...base, id: 's5', authorUid: 'u4', authorName: 'Reported User', text: 'Spammy content', createdAt: NOW - HOUR, status: 'reported', ashirvadCount: 100 },
  ];
}

function sampleProviders(): { providers: RankableProvider[]; stats: Record<string, ProviderStats> } {
  const providers: RankableProvider[] = [
    {
      uid: 'p1', name: 'Pandit Trusted', tier: 'TRUSTED',
      joinedAt: new Date(NOW - 200 * 86_400_000).toISOString(),
      categories: ['vivah'],
      serviceCard: {
        devotionalText: 'Sacred Vivah ceremonies with 25 years of Vedic tradition and complete samagri.',
        serviceLine: 'Traditional Vivah at your home', dakshina: 11000,
        currency: 'INR', modes: ['home'], providerName: 'Pandit Trusted', providerUid: 'p1', providerTier: 'TRUSTED',
      },
    },
    {
      uid: 'p2', name: 'Pandit Newcomer', tier: 'REGISTERED',
      joinedAt: new Date(NOW - 10 * 86_400_000).toISOString(),
      categories: ['vivah'],
      serviceCard: {
        devotionalText: 'Young purohit trained in Kashi, eager to serve with devotion and authenticity.',
        serviceLine: 'Vivah samskara with devotion', dakshina: 5100,
        currency: 'INR', modes: ['home'], providerName: 'Pandit Newcomer', providerUid: 'p2', providerTier: 'REGISTERED',
      },
    },
    {
      uid: 'p3', name: 'Pandit Disputed', tier: 'VERIFIED',
      joinedAt: new Date(NOW - 150 * 86_400_000).toISOString(),
      categories: ['vivah'],
      serviceCard: {
        devotionalText: 'Experienced Vivah purohit serving families across the region with traditional rites.',
        serviceLine: 'Vivah ceremony specialist', dakshina: 8000,
        currency: 'INR', modes: ['home'], providerName: 'Pandit Disputed', providerUid: 'p3', providerTier: 'VERIFIED',
      },
    },
  ];
  const stats: Record<string, ProviderStats> = {
    p1: { ...emptyProviderStats(), totalOrders: 150, completedOrders: 148, onTimeOrders: 145, gratitudeCount: 89, avgResponseHours: 0.5, lastActiveAt: NOW - HOUR },
    p2: { ...emptyProviderStats(), totalOrders: 3, completedOrders: 3, onTimeOrders: 3, gratitudeCount: 2, avgResponseHours: 2, lastActiveAt: NOW - 2 * HOUR },
    p3: { ...emptyProviderStats(), totalOrders: 80, completedOrders: 60, onTimeOrders: 50, gratitudeCount: 10, avgResponseHours: 30, activeDisputes: 2, cancelledOrders: 15, lastActiveAt: NOW - 5 * HOUR },
  };
  return { providers, stats };
}

/* ------------------------------------------------------------------ */
/* Main tab                                                            */
/* ------------------------------------------------------------------ */

export const RankingTab: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedWeights, setFeedWeights] = useState<FeedWeights>(DEFAULT_FEED_WEIGHTS);
  const [mpWeights, setMpWeights] = useState<MarketplaceWeights>(DEFAULT_MARKETPLACE_WEIGHTS);
  const [dirty, setDirty] = useState(false);
  const [previewTab, setPreviewTab] = useState<'feed' | 'marketplace'>('feed');

  useEffect(() => {
    loadRankingConfig()
      .then((cfg) => {
        setFeedWeights(cfg.feed);
        setMpWeights(cfg.marketplace);
      })
      .catch(() => { /* defaults already set */ })
      .finally(() => setLoading(false));
  }, []);

  const updateFeed = useCallback((key: keyof FeedWeights, v: number) => {
    setFeedWeights((w) => ({ ...w, [key]: v }));
    setDirty(true);
  }, []);

  const updateMp = useCallback((key: keyof MarketplaceWeights, v: number) => {
    setMpWeights((w) => ({ ...w, [key]: v }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const config: RankingConfig = {
        feed: feedWeights,
        marketplace: mpWeights,
        updatedAt: Date.now(),
      };
      await saveRankingConfig(config, 'godmode');
      setDirty(false);
      showToast('Ranking weights saved — live in ~5 minutes.', 'success');
    } catch (e) {
      showToast('Failed to save. Check connection.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFeedWeights(DEFAULT_FEED_WEIGHTS);
    setMpWeights(DEFAULT_MARKETPLACE_WEIGHTS);
    setDirty(true);
    showToast('Reset to defaults. Tap Save to apply.', 'info');
  };

  if (loading) return <Loading />;

  // Preview computations
  const feedPreview: ScoredPost[] = rankFeed(samplePosts(), emptyUserSignals(), feedWeights, {}, NOW);
  const { providers: mpProviders, stats: mpStats } = sampleProviders();
  const mpPreview: ScoredProvider[] = rankProviders(mpProviders, 'vivah', mpStats, mpWeights, NOW);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-slate-100">Ranking Engines</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Tune how the Sangam feed and Seva Bazar marketplace rank content.
          Changes apply within ~5 minutes. Every weight is explainable — no black boxes.
        </p>

        <h4 className="text-sm font-medium text-amber-300 mb-2">📰 Sangam Feed</h4>
        <WeightSlider label="Recency" hint="How much fresh posts are favored (48h gentle decay)" value={feedWeights.recency} onChange={(v) => updateFeed('recency', v)} />
        <WeightSlider label="Closeness" hint="Posts from people you interact with" value={feedWeights.closeness} onChange={(v) => updateFeed('closeness', v)} />
        <WeightSlider label="Meaningfulness" hint="Comments weigh 3×, shares 5× over Ashirvads" value={feedWeights.meaningfulness} onChange={(v) => updateFeed('meaningfulness', v)} />
        <WeightSlider label="Content affinity" hint="Boost content kinds you engage with" value={feedWeights.contentAffinity} onChange={(v) => updateFeed('contentAffinity', v)} />
        <WeightSlider label="Diversity penalty" hint="Reduces same-author clustering in top 10" value={feedWeights.diversityPenalty} onChange={(v) => updateFeed('diversityPenalty', v)} />
        <WeightSlider label="Report penalty" hint="How much reported content sinks" value={feedWeights.reportPenalty} onChange={(v) => updateFeed('reportPenalty', v)} />

        <h4 className="text-sm font-medium text-amber-300 mb-2 mt-6">🛕 Seva Bazar</h4>
        <WeightSlider label="Relevance" hint="Keyword/category match to search" value={mpWeights.relevance} onChange={(v) => updateMp('relevance', v)} />
        <WeightSlider label="Trust tier" hint="TRUSTED > VERIFIED > REGISTERED" value={mpWeights.trustTier} onChange={(v) => updateMp('trustTier', v)} />
        <WeightSlider label="Performance" hint="Completion + on-time + gratitude" value={mpWeights.performance} onChange={(v) => updateMp('performance', v)} />
        <WeightSlider label="Responsiveness" hint="Chat reply speed" value={mpWeights.responsiveness} onChange={(v) => updateMp('responsiveness', v)} />
        <WeightSlider label="Newcomer boost" hint="Fair chance for new providers (<30 days)" value={mpWeights.newcomerBoost} onChange={(v) => updateMp('newcomerBoost', v)} />
        <WeightSlider label="Dispute penalty" hint="Active disputes sink a provider" value={mpWeights.disputePenalty} onChange={(v) => updateMp('disputePenalty', v)} />

        <div className="flex gap-2 mt-4">
          <button
            type="button" onClick={handleSave} disabled={!dirty || saving}
            className="flex-1 min-h-[44px] rounded-xl bg-amber-600 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save weights'}
          </button>
          <button
            type="button" onClick={handleReset}
            className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-300 text-sm flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-slate-100">Preview with sample data</h3>
        </div>
        <div className="flex gap-1.5 mb-3">
          {(['feed', 'marketplace'] as const).map((t) => (
            <button
              key={t} type="button" onClick={() => setPreviewTab(t)}
              className={`px-4 min-h-[44px] rounded-xl text-sm ${previewTab === t ? 'bg-amber-600 text-white' : 'border border-slate-700 text-slate-300'}`}
            >
              {t === 'feed' ? '📰 Feed' : '🛕 Marketplace'}
            </button>
          ))}
        </div>

        {previewTab === 'feed' ? (
          <div className="space-y-2">
            {feedPreview.map((sp, i) => (
              <div key={sp.post.id} className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-200">#{i + 1} {sp.post.authorName}</span>
                  <span className="text-xs font-mono text-amber-400">{sp.score.toFixed(3)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{sp.post.text}</p>
                <p className="text-xs text-slate-500 mt-1 italic">{explainFeedScore(sp)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {mpPreview.map((sp, i) => (
              <div key={sp.provider.uid} className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-200">#{i + 1} {sp.provider.name}</span>
                  <span className="text-xs font-mono text-amber-400">{sp.score.toFixed(3)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 italic">{explainScore(sp, i + 1)}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-3">
          Sample data only. Move the sliders above and watch the order change in real time.
        </p>
      </Card>
    </div>
  );
};
