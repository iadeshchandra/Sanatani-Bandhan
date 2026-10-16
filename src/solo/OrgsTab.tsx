import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { Card, T, Btn } from './ui';

/* OrgsTab — "My Organisations" list at /app/orgs.
 * =====================================================================
 * Phase 1: a functional list. Tapping an org uses the EXISTING
 * exitSoloSession() + switchWorkspace() flow, so organisations stay
 * fully functional (Phase 2 builds the full in-shell org spaces).
 */

export const OrgsTab: React.FC = () => {
  const { workspaces, activeWorkspace, switchWorkspace, exitSoloSession } = useAuthWorkspace();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);

  const realWorkspaces = workspaces.filter((w) => !w.id.startsWith('DEMO_'));
  const demoWorkspaces = workspaces.filter((w) => w.id.startsWith('DEMO_'));

  const openOrg = async (wsId: string, wsName: string) => {
    setOpening(wsId);
    try {
      const ok = await switchWorkspace(wsId);
      if (ok) {
        // Existing session flow: leave the solo session, the org shell
        // (AppContent) takes over for the newly active workspace.
        exitSoloSession();
        showToast(
          `🙏 ${wsName}`,
          'success'
        );
      } else {
        showToast(
          'Could not open this organisation right now.',
          'error'
        );
      }
    } finally {
      setOpening(null);
    }
  };

  const renderRow = (ws: (typeof workspaces)[number]) => {
    const isActive = ws.id === activeWorkspace?.id;
    const busy = opening === ws.id;
    return (
      <li
        key={ws.id}
        className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
      >
        <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shrink-0" aria-hidden>
          🏛️
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-stone-900 text-sm truncate">{ws.name}</div>
          <div className="text-[11px] text-stone-500 truncate">
            {ws.type}
            {ws.city ? ` · ${ws.city}` : ''}
            {isActive && (
              <span className="ml-2 inline-block rounded-full bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5">
                <T en="Current" bn="বর্তমান" hi="वर्तमान" />
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => openOrg(ws.id, ws.name)}
          disabled={busy}
          className="shrink-0 px-4 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-temple-950 text-xs font-black transition-colors"
        >
          {busy ? '…' : <T en="Open" bn="খুলুন" hi="खोलें" />}
        </button>
      </li>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      <div>
        <h1 className="text-xl font-black text-stone-900">
          🏛️ <T en="My Organisations" bn="আমার সংগঠনসমূহ" hi="मेरे संगठन" />
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          <T
            en="Your temples, ashrams and institutions — opening one switches you to its workspace."
            bn="আপনার মন্দির, আশ্রম ও প্রতিষ্ঠান — একটি খুললে সেই কর্মক্ষেত্রে চলে যাবেন।"
            hi="आपके मंदिर, आश्रम व संस्थान — किसी एक को खोलने पर आप उसके कार्यक्षेत्र में चले जाएँगे।"
          />
        </p>
      </div>

      {realWorkspaces.length > 0 ? (
        <ul className="space-y-2">{realWorkspaces.map(renderRow)}</ul>
      ) : (
        <Card>
          <p className="text-sm text-stone-500 text-center py-4">
            <T
              en="No organisations yet. Register your temple, ashram or institution to begin."
              bn="এখনও কোনো সংগঠন নেই। শুরু করতে আপনার মন্দির, আশ্রম বা প্রতিষ্ঠান নিবন্ধন করুন।"
              hi="अभी कोई संगठन नहीं। आरंभ हेतु अपना मंदिर, आश्रम या संस्थान पंजीकृत करें।"
            />
          </p>
        </Card>
      )}

      {demoWorkspaces.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">
            <T en="Demo sandboxes" bn="ডেমো স্যান্ডবক্স" hi="डेमो सैंडबॉक्स" />
          </h2>
          <ul className="space-y-2">{demoWorkspaces.map(renderRow)}</ul>
        </div>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <div className="font-extrabold text-stone-900 text-sm">
              <T en="Starting a new institution?" bn="নতুন প্রতিষ্ঠান শুরু করছেন?" hi="नई संस्था आरंभ कर रहे हैं?" />
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <T
                en="Register your organisation and grow with Sanatani Bandhan."
                bn="আপনার সংগঠন নিবন্ধন করুন এবং সনাতনী বন্ধনের সাথে এগিয়ে যান।"
                hi="अपना संगठन पंजीकृत करें और सनातनी बंधन के साथ आगे बढ़ें।"
              />
            </div>
          </div>
          <Btn onClick={() => navigate('/register-org')}>
            <T en="Register an organisation" bn="সংগঠন নিবন্ধন" hi="संगठन पंजीकृत करें" />
          </Btn>
        </div>
      </Card>
    </div>
  );
};
