import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';

interface DeskErrorBoundaryProps {
  children: ReactNode;
  /** Desk id — also used as the React key by the caller so the boundary resets on navigation. */
  deskId: string;
  /** Human-readable desk label for the fallback (optional). */
  deskLabel?: string;
  /** Called when the user chooses "Back to Command Center". */
  onBackToDashboard: () => void;
}

interface DeskErrorBoundaryState {
  hasError: boolean;
}

/**
 * DeskErrorBoundary — per-desk error isolation.
 *
 * A single desk's render crash is contained HERE: the header, sidebar,
 * footer, command palette and all other chrome keep working. The caller
 * MUST pass `key={deskId}` so navigating to another desk mounts a fresh
 * boundary (a crash in desk A must never poison desk B).
 *
 * This complements — not replaces — the outer app-wide ErrorBoundary in
 * App.tsx, which remains the last-resort catch for chrome-level failures.
 */
export class DeskErrorBoundary extends Component<
  DeskErrorBoundaryProps,
  DeskErrorBoundaryState
> {
  public state: DeskErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): DeskErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Kept as console.error (no PII): the desk id is enough to triage.
    console.error(`[DeskErrorBoundary] desk "${this.props.deskId}" crashed:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      const label = this.props.deskLabel || this.props.deskId;
      return (
        <div
          role="alert"
          data-testid="desk-error-fallback"
          className="flex flex-col items-center justify-center text-center px-6 py-16"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-5">
            <AlertTriangle className="w-7 h-7 text-amber-700" aria-hidden="true" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 mb-2">
            ॥ धर्मो रक्षति रक्षितः ॥
          </p>
          <h2 className="text-xl font-extrabold text-stone-900 mb-2">
            This desk ran into a problem
          </h2>
          <p className="text-sm text-stone-500 font-medium max-w-md leading-relaxed mb-1">
            <span className="font-bold text-stone-700">{label}</span> could not be
            displayed. Nothing else is affected — your header, sidebar and
            navigation keep working.
          </p>
          <p className="text-xs text-stone-400 font-medium mb-6">
            If this keeps happening, please contact support with the desk name above.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>
            <button
              type="button"
              onClick={this.props.onBackToDashboard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              Back to Command Center
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
