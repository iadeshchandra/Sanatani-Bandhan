/**
 * Sanatani Bandhan — In-App Persona Testing Rig (Phase 10b)
 * Floating, dockable toolbar fixed at bottom-center (z-index: 9999) with dark/slate aesthetic.
 * Strict standard roles only: Devotee, Priest, Accountant, CSO.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  X,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import { runRBACDiagnostics, RBACDiagnosticReport } from '../../utils/rbacDiagnostics';

export interface PersonaRoleConfig {
  id: string;
  role: 'Devotee' | 'Priest' | 'Accountant' | 'CSO';
  name: string;
  emoji: string;
  targetModule: string;
  deskLabel: string;
  domain: string;
  description: string;
  accent: {
    bg: string;
    border: string;
    text: string;
    activeRing: string;
    badge: string;
  };
}

// Exactly 4 Standard Operational Roles
const ROLES: PersonaRoleConfig[] = [
  {
    id: 'devotee',
    role: 'Devotee',
    name: 'Arun Sharma',
    emoji: '🪔',
    targetModule: 'devoteePortal',
    deskLabel: 'Devotee Super App',
    domain: 'B2C Pilgrim',
    description: 'B2C Pilgrim view; hides all ERP admin sidebars and headers.',
    accent: {
      bg: 'bg-amber-950/70',
      border: 'border-amber-500/40',
      text: 'text-amber-300',
      activeRing: 'ring-2 ring-amber-400',
      badge: 'bg-amber-500 text-slate-950',
    },
  },
  {
    id: 'priest',
    role: 'Priest',
    name: 'Acharya Vidyadhar',
    emoji: '🕉️',
    targetModule: 'sanctum-hud',
    deskLabel: 'Sanctum HUD',
    domain: 'Domain 3',
    description: 'Vedic ritual leader; granted Sanctum HUD, firewalled from Treasury & Gate Command.',
    accent: {
      bg: 'bg-orange-950/70',
      border: 'border-orange-500/40',
      text: 'text-orange-300',
      activeRing: 'ring-2 ring-orange-400',
      badge: 'bg-orange-500 text-slate-950',
    },
  },
  {
    id: 'accountant',
    role: 'Accountant',
    name: 'Suresh CA',
    emoji: '📊',
    targetModule: 'treasury-audit',
    deskLabel: 'Treasury Audit',
    domain: 'Domain 2',
    description: 'Financial auditor; granted Treasury & Audit Ledger, firewalled from Gate & Rituals.',
    accent: {
      bg: 'bg-emerald-950/70',
      border: 'border-emerald-500/40',
      text: 'text-emerald-300',
      activeRing: 'ring-2 ring-emerald-400',
      badge: 'bg-emerald-500 text-slate-950',
    },
  },
  {
    id: 'cso',
    role: 'CSO',
    name: 'Vikram Rathore',
    emoji: '🛡️',
    targetModule: 'tactical-radar',
    deskLabel: 'Tactical Radar',
    domain: 'Domain 6',
    description: 'Chief Security Officer; granted Tactical Radar & Gate Command.',
    accent: {
      bg: 'bg-sky-950/70',
      border: 'border-sky-500/40',
      text: 'text-sky-300',
      activeRing: 'ring-2 ring-sky-400',
      badge: 'bg-sky-500 text-slate-950',
    },
  },
];

export const PersonaSwitcher: React.FC = () => {
  const { currentRole, currentUser, switchPersona, switchRole, loginAsRole, setViewMode } = useAuthWorkspace();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Collapsible state (collapsed by default into small "Roles" tab)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeReport, setActiveReport] = useState<RBACDiagnosticReport | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [isExecutingCheck, setIsExecutingCheck] = useState<boolean>(false);

  // Keyboard shortcut listener: Ctrl+Shift+P / Cmd+Shift+P to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRoleSelect = (item: PersonaRoleConfig) => {
    // 1. Update currentRole in the system
    if (switchPersona) {
      switchPersona(item.role, item.name, item.targetModule);
    } else if (switchRole) {
      switchRole(item.role);
    } else if (loginAsRole) {
      loginAsRole(item.role, item.name);
    }

    try {
      localStorage.setItem('sanatani_user_role', item.role);
    } catch {
      // safe fallback
    }

    // 2. Dispatch custom events for components listening to module navigation
    window.dispatchEvent(
      new CustomEvent('sanatani:navigate', {
        detail: { module: item.targetModule, role: item.role, user: item.name },
      })
    );
    window.dispatchEvent(
      new CustomEvent('navigate_module', {
        detail: { module: item.targetModule },
      })
    );

    // 3. Navigation according to role directives
    if (item.role === 'Devotee') {
      // If Devotee: Navigate to /devotee and set member view mode
      if (setViewMode) setViewMode('MEMBER');
      navigate('/devotee');
    } else {
      // If Priest, Accountant, CSO: Navigate to / and set manager view mode
      if (setViewMode) setViewMode('MANAGER');
      navigate('/');
    }

    // 4. Trigger Toast notification: "Switched to [Role] view."
    showToast(`Switched to ${item.role} view.`, 'success');
  };

  const handleRunHealthcheck = () => {
    setIsExecutingCheck(true);
    try {
      const report = runRBACDiagnostics();
      setActiveReport(report);

      if (report.passedCount === report.totalTests) {
        showToast(
          `All ${report.totalTests} RBAC Security Tests Passed! Sovereign boundaries intact 🛡️`,
          'success',
          'Security Healthcheck'
        );
      } else {
        showToast(
          `Security Alert: ${report.failedCount} of ${report.totalTests} tests failed! ⚠️`,
          'error',
          'RBAC Warning'
        );
      }
    } catch (err: any) {
      console.warn('Error running RBAC diagnostics:', err);
      showToast('Diagnostic execution notice: ' + (err.message || 'Check completed'), 'info');
    } finally {
      setIsExecutingCheck(false);
    }
  };

  // Find active persona or default to first
  const activePersona =
    ROLES.find((r) => r.role === currentRole) ||
    ROLES[0];

  return (
    <>
      {/* Floating dock fixed at bottom-center of the screen (z-index 9999) */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 max-w-[96vw] sm:max-w-3xl"
        role="region"
        aria-label="In-App Persona Testing Rig"
      >
        {!isExpanded ? (
          /* Collapsed "Roles" tab that expands on click */
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-white text-xs font-mono font-bold hover:border-amber-500/50 hover:bg-slate-900 transition-all cursor-pointer group"
            title="Expand Persona Testing Rig (Ctrl+Shift+P)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-200 group-hover:text-amber-400">Roles</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
              <span>{activePersona.emoji}</span>
              <span>{currentRole || activePersona.role}</span>
            </span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-transform" />
          </button>
        ) : (
          /* Expanded Full Toolbar Dock (Dark / Slate aesthetic) */
          <div className="rounded-2xl sm:rounded-3xl bg-slate-950/95 backdrop-blur-lg border border-slate-800 shadow-2xl p-3 sm:p-4 text-white space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Dock Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-200">
                  Persona Testing Rig
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                  Ctrl+Shift+P
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunHealthcheck}
                  disabled={isExecutingCheck}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                  title="Run RBAC Security Audit"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isExecutingCheck ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Healthcheck</span>
                </button>

                {activeReport && (
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Audit Log</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                {/* Collapsible Roles toggle button */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors cursor-pointer"
                  title="Collapse Toolbar"
                >
                  <span>Roles</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Exactly 4 Role Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLES.map((persona) => {
                const isActive = currentRole === persona.role;

                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleRoleSelect(persona)}
                    className={`relative text-left p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between min-h-[78px] ${
                      isActive
                        ? `${persona.accent.bg} ${persona.accent.border} ${persona.accent.activeRing} shadow-lg shadow-black/40`
                        : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black uppercase bg-emerald-500 text-slate-950 shadow-xs">
                        Active
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl leading-none">{persona.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase tracking-wider block text-slate-200 group-hover:text-white truncate">
                          {persona.role}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-slate-300 truncate">{persona.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        → {persona.deskLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current Session Summary Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-850 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-500">Active Role:</span>
                <span className="font-bold text-amber-300 truncate">
                  {currentRole || 'Devotee'}
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400 truncate">
                  {currentUser?.name || activePersona.name}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                <span>Domain Guard:</span>
                <span className="text-emerald-400 font-bold">Enforced Least-Privilege</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security Healthcheck Report Modal */}
      {showReportModal && activeReport && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">
                    RBAC Security Verification Report
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    {activeReport.suiteName} &bull; {new Date(activeReport.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Metric Strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Tests</span>
                <span className="text-xl font-mono font-black text-white">{activeReport.totalTests}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-[10px] font-mono uppercase text-emerald-400 block">Passed</span>
                <span className="text-xl font-mono font-black text-emerald-300">
                  {activeReport.passedCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center">
                <span className="text-[10px] font-mono uppercase text-rose-400 block">Failed</span>
                <span className="text-xl font-mono font-black text-rose-300">
                  {activeReport.failedCount}
                </span>
              </div>
            </div>

            {/* Test Results Table */}
            <div className="grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {activeReport.results.map((r) => (
                <div
                  key={r.testId}
                  className={`p-3 rounded-xl border flex items-start gap-3 ${
                    r.status === 'PASSED'
                      ? 'bg-slate-950/60 border-slate-800 text-slate-200'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-100'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {r.status === 'PASSED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="min-w-0 grow">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white">{r.testName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                        {r.roleUnderAudit}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{r.evidence}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PersonaSwitcher;
