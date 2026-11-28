import React from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { APP_VERSION } from '../../lib/appVersion';

interface FooterProps {
  onOpenTelemetry?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTelemetry }) => {
  const { checkPermission } = useAuthWorkspace();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
        <p className="font-medium text-slate-600">
          Made with ❤️ for <span className="text-saffron-500 font-bold">Dharmic institutions</span> • Sanatani Bandhan
        </p>
        <div className="flex items-center gap-3">
          {onOpenTelemetry && checkPermission(['SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN']) && (
            <button
              type="button"
              onClick={onOpenTelemetry}
              className="text-saffron-500 hover:text-saffron-600 transition-colors font-semibold cursor-pointer"
            >
              GA4 Telemetry Inspector
            </button>
          )}
          {/* F3 (Test #3 finding #32): the footer used to hard-code
              a version string that never matched any real build. It
              now reads the one build stamp (lib/appVersion, the same
              source version.json and the Profile screen use). */}
          <p>Sanatani Bandhan {APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
};
