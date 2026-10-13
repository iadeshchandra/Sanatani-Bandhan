import React from 'react';
import { motion } from 'motion/react';
import { KeyRound, User, Building2, Flame, Sparkles } from 'lucide-react';

export type AuthDoorId = 'LOGIN' | 'SOLO' | 'REGISTER' | 'PUROHIT' | 'JYOTISHI';

/**
 * AuthDoors — animated segmented control for the five auth doors.
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
  { id: 'LOGIN', icon: <KeyRound size={15} /> },
  { id: 'SOLO', icon: <User size={15} /> },
  { id: 'REGISTER', icon: <Building2 size={15} /> },
  { id: 'PUROHIT', icon: <Flame size={15} /> },
  { id: 'JYOTISHI', icon: <Sparkles size={15} /> },
];

export const AuthDoors: React.FC<AuthDoorsProps> = ({ active, onChange, labels, hints }) => (
  <div
    role="tablist"
    aria-label="Choose how to enter"
    className="relative flex items-stretch gap-1 p-1.5 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md overflow-x-auto"
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
          className={`relative flex-1 min-w-[86px] min-h-[48px] px-3 py-2.5 rounded-xl text-[12.5px] font-bold whitespace-nowrap transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
            isActive ? 'text-[#2a1503]' : 'text-white/60 hover:text-white'
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="auth-door-pill"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-xl bg-gradient-to-br from-saffron-300 via-amber-300 to-orange-400 shadow-[0_6px_20px_rgba(255,142,0,0.45)]"
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
