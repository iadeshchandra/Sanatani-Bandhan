import React, { useMemo } from 'react';
import { Swords, Users, UserCheck, PhoneCall, ChevronRight, MailOpen, Vote } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { isModuleAllowed } from '../../lib/workspaceRegistry';

/**
 * SanghaMobilizationSurface — QUEUED #48 (live-audit fix, 2026-10-20).
 *
 * The "Sangha & Shakha Mobilization" desk id ('sanghaDrills') was routed
 * by App.tsx's switch to the Gurukul desk component, so a Sangha opening
 * its signature desk got "Vedic Gurukul & Shastra Education Desk" under a
 * Sangha breadcrumb. No dedicated shakha-mobilisation desk component
 * exists in the codebase — this surface is the honest interim: it is
 * labelled as the Sangha's mobilisation desk, and everything on it is
 * the org's REAL data (the live member directory from DataContext) plus
 * working routes into the full member directory, the sevadar roster,
 * membership invites and panchayat polls. No shakha data is invented —
 * when a dedicated shakha desk is built, it replaces this surface and
 * the switch case in App.tsx (flagged in the #48 report).
 */

function goModule(moduleId: string) {
  window.dispatchEvent(new CustomEvent('navigate_module', { detail: moduleId }));
}

export const SanghaMobilizationSurface: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { devotees } = useData();

  const members = useMemo(
    () =>
      (devotees || []).map((d) => ({
        id: d.id,
        name: d.fullName || d.name || 'Unnamed member',
        role: typeof d.role === 'string' ? d.role : '',
        phone: d.phone || d.sponsorPhone || '',
      })),
    [devotees],
  );

  const sevadarCount = useMemo(
    () => members.filter((m) => /sevadar|volunteer|sewak/i.test(m.role)).length,
    [members],
  );
  const reachableCount = useMemo(
    () => members.filter((m) => m.phone && m.phone !== 'N/A').length,
    [members],
  );

  const canMembership = isModuleAllowed(activeWorkspace, 'membership');
  const canPolls = isModuleAllowed(activeWorkspace, 'panchayatPolls');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              संघ • Sangha &amp; Shakha Mobilization
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {members.length} members on the roll
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Sangha &amp; Shakha Mobilization
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            {activeWorkspace?.name || 'Your sangha'} — organise members and sevadars into shakhas,
            and mobilise them for seva, satsang and mahotsav duty.
          </p>
        </div>
        <button
          type="button"
          onClick={() => goModule('sevadar-roster')}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <UserCheck className="w-4 h-4" />
          <span>Open Sevadar Roster</span>
        </button>
      </div>

      {/* Honest scope note */}
      <div className="rounded-2xl border border-temple-800 bg-temple-900/60 px-4 py-3 text-xs text-temple-300">
        <span className="font-bold text-saffron-400">How mobilisation works in this build: </span>
        shakha mobilisation runs on your live member directory and sevadar roster — the members
        below are your sangha&apos;s real roll, not sample data. Form shakha units from the
        directory, assign duty through the sevadar roster, and reach members through Sandesh
        Broadcast.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" /> Members on roll
          </div>
          <p className="text-2xl font-extrabold text-temple-100 mt-1">{members.length}</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wide">
            <UserCheck className="w-3.5 h-3.5" /> Sevadars &amp; volunteers
          </div>
          <p className="text-2xl font-extrabold text-temple-100 mt-1">{sevadarCount}</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wide">
            <PhoneCall className="w-3.5 h-3.5" /> Reachable by phone
          </div>
          <p className="text-2xl font-extrabold text-temple-100 mt-1">{reachableCount}</p>
        </div>
      </div>

      {/* Member roll */}
      {members.length === 0 ? (
        <div className="bg-temple-900/90 border border-dashed border-temple-700 rounded-3xl p-10 text-center shadow-lg">
          <Swords className="w-10 h-10 text-saffron-500/70 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-temple-100">No members on the roll yet</h3>
          <p className="text-xs text-temple-400 mt-1 max-w-md mx-auto">
            A shakha is its people. Add your sangha&apos;s members to the directory — names,
            phones and roles — and they will appear here, ready to mobilise.
          </p>
          <button
            type="button"
            onClick={() => goModule('devotees')}
            className="mt-4 px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Open Member Directory</span>
          </button>
        </div>
      ) : (
        <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-temple-100">Member roll — ready to mobilise</h3>
            <button
              type="button"
              onClick={() => goModule('devotees')}
              className="text-saffron-400 hover:text-saffron-300 font-bold text-xs inline-flex items-center gap-0.5 cursor-pointer"
            >
              Full directory <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-temple-800">
            {members.slice(0, 12).map((m) => (
              <li key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-temple-100 truncate">{m.name}</p>
                  {m.role && <p className="text-[11px] text-temple-400">{m.role}</p>}
                </div>
                {m.phone && m.phone !== 'N/A' && (
                  <span className="text-[11px] font-mono text-temple-300 shrink-0">{m.phone}</span>
                )}
              </li>
            ))}
          </ul>
          {members.length > 12 && (
            <p className="text-[11px] text-temple-500 mt-3">
              + {members.length - 12} more in the full directory.
            </p>
          )}
        </div>
      )}

      {/* Mobilisation routes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => goModule('devotees')}
          className="text-left bg-temple-900/90 border border-temple-800 hover:border-saffron-500/40 rounded-2xl p-5 shadow-lg transition-all cursor-pointer"
        >
          <Users className="w-5 h-5 text-saffron-400 mb-2" />
          <p className="text-sm font-bold text-temple-100">Member Directory</p>
          <p className="text-[11px] text-temple-400 mt-0.5">The sangha roll — add, edit and organise members.</p>
        </button>
        {canMembership && (
          <button
            type="button"
            onClick={() => goModule('membership')}
            className="text-left bg-temple-900/90 border border-temple-800 hover:border-saffron-500/40 rounded-2xl p-5 shadow-lg transition-all cursor-pointer"
          >
            <MailOpen className="w-5 h-5 text-saffron-400 mb-2" />
            <p className="text-sm font-bold text-temple-100">Invites &amp; Requests</p>
            <p className="text-[11px] text-temple-400 mt-0.5">Grow the sangha — approve join requests and send invites.</p>
          </button>
        )}
        {canPolls && (
          <button
            type="button"
            onClick={() => goModule('panchayatPolls')}
            className="text-left bg-temple-900/90 border border-temple-800 hover:border-saffron-500/40 rounded-2xl p-5 shadow-lg transition-all cursor-pointer"
          >
            <Vote className="w-5 h-5 text-saffron-400 mb-2" />
            <p className="text-sm font-bold text-temple-100">Panchayat Polls</p>
            <p className="text-[11px] text-temple-400 mt-0.5">Collect the sangha&apos;s voice before a mobilisation call.</p>
          </button>
        )}
      </div>
    </div>
  );
};

export default SanghaMobilizationSurface;
