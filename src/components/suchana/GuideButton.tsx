/**
 * GuideButton.tsx — Reusable contextual guide button.
 * =====================================================
 * A small (?) button for module headers. Opens the upgraded
 * QuickGuideModal for the given module id.
 *
 * Usage: <GuideButton moduleId="treasury" />
 */
import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { QuickGuideModal } from '../common/QuickGuideModal';

export const GuideButton: React.FC<{
  moduleId: string;
  className?: string;
  label?: string;
}> = ({ moduleId, className = '', label }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label || `Guide for ${moduleId}`}
        title={label || 'How to use this module'}
        className={`inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors ${className}`}
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      {open && (
        <QuickGuideModal isOpen={true} onClose={() => setOpen(false)} activeModule={moduleId} />
      )}
    </>
  );
};

// CI re-trigger
