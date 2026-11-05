import React from 'react';
import { motion } from 'motion/react';
import { KeyRound, UserPlus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type AuthDoorId = 'SIGNIN' | 'SIGNUP';

/**
 * AuthDoors — animated segmented control for the two auth doors.
 * E4: light sanctum dress — brass-hairline trough, house --cta pill.
 * The active pill slides between doors via motion layoutId
 * (GPU transform, no measurement code, no layout thrash).
 */
interface AuthDoorsProps {
  active: AuthDoorId;
  onChange: (door: AuthDoorId) => void;
  labels: Record<AuthDoorId, string>;
  hints: Partial<Record<AuthDoorId, string>>;
}

const DOORS: { id: AuthDoorId; icon: React.ReactNode }[] = [
  { id: 'SIGNIN', icon: <KeyRound size={15} /> },
  { id: 'SIGNUP', icon: <UserPlus size={15} /> },
];

export const AuthDoors: React.FC<AuthDoorsProps> = ({ active, onChange, labels, hints }) => {
  const { t } = useLanguage();
  return (
  <div
    role="tablist"
    aria-label={t('surfaces.chrome.chooseHowToEnter')}
    className="relative flex items-stretch gap-1 p-1.5 rounded-2xl bg-temple-100/80 border border-brass-200"
  >
    {DOORS.map((d) => {
      const isActive = d.id === active;
      return (
        <button
          key={d.id}
          role="tab"
          aria-selected={isActive}
          title={hints[d.id]}
          onClick={() => onChange(d.id)}
          className={`relative flex-1 min-h-[48px] px-3 py-2.5 rounded-xl text-[13px] sm:text-[14px] font-bold whitespace-nowrap transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
            isActive ? 'text-white' : 'text-temple-600 hover:text-temple-900'
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="auth-door-pill"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-xl bg-cta shadow-[0_6px_20px_rgba(194,83,0,0.4)]"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {d.icon}
            {labels[d.id]}
          </span>
        </button>
      );
    })}
  </div>
  );
};
