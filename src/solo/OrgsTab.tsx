import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useMembership } from '../context/MembershipContext';
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
  const { browseOrgPages } = useMembership();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [suggested, setSuggested] = useState<Array<{ orgId: string; name: string; type?: string; city?: string }>>([]);

  const realWorkspaces = workspaces.filter((w) => !w.id.startsWith('DEMO_'));
  const demoWorkspaces = workspaces.filter((w) => w.id.startsWith('DEMO_'));

  // Cross-org search across joined organisations (RBAC-safe by construction:
  // only orgs this user belongs to are searchable here).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? realWorkspaces.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          String(w.type || '').toLowerCase().includes(q) ||
          String(w.city || '').toLowerCase().includes(q)
      )
    : realWorkspaces;

  // Warm suggestions when the user belongs to no org yet.
  useEffect(() => {
    let live = true;
    if (realWorkspaces.length === 0) {
      browseOrgPages(undefined)
        .then((pages) => {
          if (!live) return;
          setSuggested(
            (pages || []).slice(0, 3).map((p: any) => ({
              orgId: p.orgId,
              name: p.name,
              type: p.type,
              city: p.city,
            }))
          );
        })
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, []);

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
    // Demo sandboxes have no published orgPages doc — the public-page
    // door is offered only for real organisations (orgId == workspace id).
    const isDemo = ws.id.startsWith('DEMO_');
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
        {/* Public-page door (audit 2026-10-20, offense #10): "Open" enters
            the workspace, but devotees also need the public face — aarti
            schedules, campus map, events and live darshan live there. */}
        {!isDemo && (
          <button
            type="button"
            onClick={() => navigate(`/org/${ws.id}`)}
            className="shrink-0 px-3 py-2 min-h-[44px] rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black transition-colors"
          >
            <T en="View public page" bn="পাবলিক পেজ দেখুন" hi="सार्वजनिक पेज देखें" />
          </button>
        )}
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
        {/* Cross-org search */}
        <div className="mt-3 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your organisations…"
            aria-label="Search your organisations"
            className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-2xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <ul className="space-y-2">{filtered.map(renderRow)}</ul>
      ) : q ? (
        <Card>
          <p className="text-sm text-stone-500 text-center py-4">
            <T
              en="No organisations match your search."
              bn="আপনার খোঁজের সঙ্গে কোনো সংগঠন মেলেনি।"
              hi="आपकी खोज से कोई संगठन नहीं मिला।"
            />
          </p>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-6 px-4">
            <div className="text-5xl mb-3" aria-hidden>
              🏛️
            </div>
            <p className="font-extrabold text-stone-900 text-sm">
              <T
                en="Your sangha awaits"
                bn="আপনার সংঘ অপেক্ষা করছে"
                hi="आपका संघ प्रतीक्षा कर रहा है"
              />
            </p>
            <p className="text-xs text-stone-500 mt-2 max-w-sm mx-auto leading-relaxed">
              <T
                en="Join your temple, ashram or institution to see its life here — festivals, announcements and what needs you, all in one glance."
                bn="আপনার মন্দির, আশ্রম বা প্রতিষ্ঠানে যোগ দিন — উৎসব, ঘোষণা ও আপনার প্রয়োজনীয় সবকিছু এক নজরে দেখুন।"
                hi="अपने मंदिर, आश्रम या संस्थान से जुड़ें — उत्सव, घोषणाएँ व आपको क्या चाहिए, सब एक नज़र में देखें।"
              />
            </p>
            {suggested.length > 0 && (
              <div className="mt-4 space-y-2 text-left">
                <div className="text-[11px] font-black uppercase tracking-widest text-stone-400">
                  <T en="Suggested for you" bn="আপনার জন্য প্রস্তাবিত" hi="आपके लिए सुझाव" />
                </div>
                {suggested.map((s) => (
                  <button
                    key={s.orgId}
                    type="button"
                    onClick={() => navigate('/app/orgs/join')}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors min-h-[56px]"
                  >
                    <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0" aria-hidden>
                      🏛️
                    </span>
                    <span className="min-w-0">
                      <span className="block font-extrabold text-stone-900 text-sm truncate">{s.name}</span>
                      <span className="block text-[11px] text-stone-500 truncate">
                        {s.type}
                        {s.city ? ` · ${s.city}` : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              <T en="Looking for another organisation?" bn="আরেকটি সংগঠন খুঁজছেন?" hi="कोई और संगठन खोज रहे हैं?" />
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <T
                en="Search the directory and request membership — or register your own institution."
                bn="নির্দেশিকা থেকে খুঁজে সদস্যতার অনুরোধ করুন — অথবা নিজের প্রতিষ্ঠান নিবন্ধন করুন।"
                hi="निर्देशिका में खोजकर सदस्यता अनुरोध भेजें — या अपना संस्थान पंजीकृत करें।"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => navigate('/app/orgs/join')}>
              <T en="Find an organisation" bn="সংগঠন খুঁজুন" hi="संगठन खोजें" />
            </Btn>
            <Btn onClick={() => navigate('/register-org')}>
              <T en="Register an organisation" bn="সংগঠন নিবন্ধন" hi="संगठन पंजीकृत करें" />
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};
