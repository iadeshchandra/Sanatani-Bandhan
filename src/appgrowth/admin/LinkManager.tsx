/**
 * LinkManager — App Growth admin: store links + "Go live" control.
 * =================================================================
 * Owner pastes the Google Play Store URL, flips "Go live", and the public
 * `/get-app` landing page (Landing builder) reads it via useAppGrowthConfig.
 * iOS is LOCKED to PWA mode by product decision: iOS users get the PWA —
 * instant install, no App Store review. The App Store URL field stays
 * disabled ("coming later") but the config contract keeps `iosMode` and
 * `appStoreUrl` so a future listing needs zero migration.
 */
import React, { useEffect, useState } from 'react';
import { ExternalLink, Smartphone, Monitor, Apple, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppGrowthConfig, isOwnerClient } from '../useAppGrowthConfig';
import { useToast } from '../../context/ToastContext';
import { Card, Loading, SectionTitle, Field, inputCls, btnPrimary } from './ui';

const isValidStoreUrl = (u: string) => /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[\w.]+/.test(u.trim());

/** What /get-app shows for each device, rendered from the SAME config the landing reads. */
const DeviceMock: React.FC<{ kind: 'android' | 'ios' | 'desktop'; playLive: boolean; playUrl: string }> = ({ kind, playLive, playUrl }) => {
  const body = (() => {
    if (kind === 'android') {
      return playLive && playUrl
        ? <a href={playUrl} target="_blank" rel="noreferrer" className="block w-full rounded-xl bg-slate-950 border border-saffron-500/50 px-3 py-2.5 text-center text-xs font-bold text-saffron-300">⬇ Get it on Google Play</a>
        : <div className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-center text-xs text-slate-300">📲 Install the app (PWA)<br /><span className="text-slate-500">Tap ⋮ → Add to Home screen</span></div>;
    }
    if (kind === 'ios') {
      return <div className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-center text-xs text-slate-300">📲 Install the app (PWA)<br /><span className="text-slate-500">Share → Add to Home Screen</span></div>;
    }
    return <div className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-center text-xs text-slate-300">💻 Install the app (PWA)<br /><span className="text-slate-500">Click the install icon in the address bar</span></div>;
  })();
  const icon = kind === 'android' ? <Play className="w-4 h-4" /> : kind === 'ios' ? <Apple className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;
  return (
    <div className="flex-1 min-w-[150px]">
      <div className="mx-auto w-36 rounded-[1.6rem] border-2 border-slate-700 bg-slate-950 p-2">
        <div className="rounded-[1.1rem] bg-gradient-to-b from-amber-950/60 to-slate-950 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-saffron-300">{icon}<span className="text-[10px] font-black tracking-widest uppercase">{kind}</span></div>
          <p className="text-[11px] font-bold text-white leading-snug">Carry your Mandir in your pocket</p>
          {body}
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-500 mt-1 capitalize">{kind} preview</p>
    </div>
  );
};

export const LinkManager: React.FC = () => {
  const { config, loading, save } = useAppGrowthConfig();
  const { showToast } = useToast();
  const [playUrl, setPlayUrl] = useState('');
  const [live, setLive] = useState(false);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPlayUrl(config.playStoreUrl);
    setLive(config.playStoreLive);
    setAppStoreUrl(config.appStoreUrl);
    setDirty(false);
  }, [config]);

  if (loading) return <Loading text="Loading store links…" />;

  const urlOk = playUrl.trim() === '' || isValidStoreUrl(playUrl);
  const canGoLive = isValidStoreUrl(playUrl);

  const handleSave = async () => {
    if (!isOwnerClient()) { showToast('Only the platform owner can save.', 'error'); return; }
    if (!urlOk) { showToast('That Play Store URL does not look right (expected https://play.google.com/store/apps/details?id=…).', 'error'); return; }
    if (live && !canGoLive) { showToast('Add a valid Play Store URL before going live.', 'error'); return; }
    setSaving(true);
    try {
      await save({ playStoreUrl: playUrl.trim(), playStoreLive: live, iosMode: 'pwa', appStoreUrl: appStoreUrl.trim() });
      setDirty(false);
      showToast(live ? 'Android is LIVE — /get-app now offers the Play Store link.' : 'Links saved.', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle hint="What the public /get-app page offers Android users.">Google Play — Android</SectionTitle>
        <div className="space-y-3">
          <Field label="Play Store URL" hint="Paste the full listing URL, e.g. https://play.google.com/store/apps/details?id=app.sanatanibandhan">
            <input
              className={inputCls}
              placeholder="https://play.google.com/store/apps/details?id=…"
              value={playUrl}
              onChange={(e) => { setPlayUrl(e.target.value); setDirty(true); }}
              inputMode="url"
            />
          </Field>
          {!urlOk && (
            <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" /> URL format not recognised — save is blocked until fixed.</p>
          )}
          <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                {live ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Smartphone className="w-4 h-4 text-slate-400" />}
                {live ? 'Android is LIVE' : 'Android shows PWA'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {live ? '/get-app shows the Play Store button to Android visitors.' : 'Flip this when the Play listing is approved — visitors get the PWA path until then.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={live}
              disabled={!canGoLive && !live}
              title={!canGoLive && !live ? 'Add a valid Play Store URL first' : 'Toggle Play Store live'}
              onClick={() => { setLive(!live); setDirty(true); }}
              className={`relative w-14 h-8 shrink-0 rounded-full transition-colors min-h-[32px] ${live ? 'bg-emerald-500' : 'bg-slate-700'} disabled:opacity-40`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${live ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          {playUrl.trim() && (
            <a href={playUrl.trim()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-saffron-300 hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Open listing to verify
            </a>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Product decision: iOS users get the PWA — instant install, no App Store review queue.">Apple — iOS (PWA locked)</SectionTitle>
        <div className="rounded-xl border border-saffron-500/30 bg-saffron-500/5 p-3 text-xs text-slate-300">
          <p className="font-bold text-saffron-200 mb-1">Why PWA on iOS?</p>
          <p className="text-slate-400 leading-relaxed">
            iOS users get the full app as a PWA — installable from Safari in two taps, updates instantly,
            zero review risk. The App Store path stays reserved for later; the config contract already
            carries <span className="font-mono text-slate-300">iosMode</span> + <span className="font-mono text-slate-300">appStoreUrl</span>,
            so a future listing needs no migration.
          </p>
        </div>
        <div className="mt-3 opacity-60">
          <Field label="App Store URL (coming later)" hint="Unlocks automatically if iosMode ever leaves 'pwa'.">
            <input className={inputCls} value={appStoreUrl} disabled placeholder="Not yet — reserved for a future listing" />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Always on — every visitor has a working install path.">PWA fallback</SectionTitle>
        <p className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="w-4 h-4" /> Always on — the PWA install path works on Android, iOS and desktop regardless of store status.</p>
      </Card>

      <Card>
        <SectionTitle hint="Live rendering of what /get-app offers each device, from the current saved config.">Device previews</SectionTitle>
        <div className="flex flex-wrap gap-3 justify-center">
          <DeviceMock kind="android" playLive={config.playStoreLive} playUrl={config.playStoreUrl} />
          <DeviceMock kind="ios" playLive={config.playStoreLive} playUrl={config.playStoreUrl} />
          <DeviceMock kind="desktop" playLive={config.playStoreLive} playUrl={config.playStoreUrl} />
        </div>
        {dirty && <p className="text-center text-[11px] text-amber-400 mt-2">You have unsaved changes — previews reflect the last saved config.</p>}
      </Card>

      <div className="sticky bottom-0 pb-1">
        <button type="button" className={`${btnPrimary} w-full`} disabled={saving || !dirty} onClick={handleSave}>
          {saving ? 'Saving…' : dirty ? 'Save links' : 'Saved ✓'}
        </button>
      </div>
    </div>
  );
};
