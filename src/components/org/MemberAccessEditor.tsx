/**
 * MemberAccessEditor — Blueprint B: the role-assignment editor.
 * ==========================================================================
 * One editor for both assignment moments (invite + editing an
 * existing member), so the law is identical in both places:
 *  - pick one of the 10 role TEMPLATES (lib/roleTemplates) or a
 *    custom canonical role;
 *  - optionally NARROW the desk scope (a template's scope is the
 *    ceiling — the picker only offers desks inside it; for unscoped
 *    templates/roles the universe is the role's own visibility);
 *  - optionally set a role expiry (template defaults pre-filled).
 * The editor emits a resolved RoleAssignment (resolveAssignment)
 * on every change; validation (validateAssignment) is the parent's
 * submit gate, rendered here as inline guidance.
 */
import React, { useMemo, useState } from 'react';
import { CalendarClock, Lock, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { MODULE_CATALOG } from '../common/Sidebar';
import {
  ROLE_TEMPLATES,
  desksVisibleForRole,
  resolveAssignment,
  templateById,
  validateAssignment,
  type RoleAssignment,
} from '../../lib/roleTemplates';
import { TRUSTEE_GRANTABLE_ROLES } from '../../types/membership';
import { resolveEdgeRole } from '../../lib/landingSurface';
import type { UserRole } from '../../types';

interface Props {
  /** Current assignment (controlled). */
  value: RoleAssignment;
  onChange: (a: RoleAssignment) => void;
  /** SuperAdmins may grant every template/role; Trustees the
   *  trustee-grantable matrix (already enforced downstream too). */
  isSuperAdmin: boolean;
}

const inputCls =
  'w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none min-h-[44px]';

const toDateInput = (ms: number | null): string => {
  if (ms == null) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** A picked date means "through the end of that day". */
const fromDateInput = (v: string): number | null => {
  if (!v) return null;
  const d = new Date(`${v}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
};

export const MemberAccessEditor: React.FC<Props> = ({ value, onChange, isSuperAdmin }) => {
  const { t } = useLanguage();
  const [scopeOpen, setScopeOpen] = useState<boolean>(value.deskScope != null);

  const grantableRoles = useMemo<readonly string[]>(
    () =>
      isSuperAdmin
        ? ['Priest', 'Accountant', 'Sevadar', 'Devotee', 'CSO', 'Auditor', 'Trustee', 'SuperAdmin']
        : TRUSTEE_GRANTABLE_ROLES,
    [isSuperAdmin]
  );
  const templates = useMemo(
    () => ROLE_TEMPLATES.filter((tpl) => grantableRoles.includes(tpl.role)),
    [grantableRoles]
  );
  const template = templateById(value.templateId);

  // The desk-picker universe: role visibility ∩ template ceiling
  // (or the curated pick list for scopeRequired templates).
  const pickableDesks = useMemo(() => {
    const visible = desksVisibleForRole(value.role as UserRole, MODULE_CATALOG);
    const limit = template?.pickableDesks ?? template?.deskScope ?? null;
    const universe = limit ? visible.filter((d) => limit.includes(d)) : visible;
    return universe.filter((d) => d !== 'dashboard');
  }, [value.role, template]);

  const errors = validateAssignment(value, Date.now());

  const pickTemplate = (templateId: string) => {
    if (templateId === '__custom__') {
      onChange(
        resolveAssignment(
          { templateId: null, role: value.role, deskScope: value.deskScope, roleExpiresAt: value.roleExpiresAt },
          Date.now()
        )
      );
      return;
    }
    const tpl = templateById(templateId);
    if (!tpl) return;
    setScopeOpen(tpl.deskScope != null);
    onChange(resolveAssignment({ templateId }, Date.now()));
  };

  const pickRole = (role: string) => {
    onChange(
      resolveAssignment(
        { templateId: null, role, deskScope: value.deskScope, roleExpiresAt: value.roleExpiresAt },
        Date.now()
      )
    );
  };

  const toggleDesk = (deskId: string, on: boolean) => {
    const current = new Set(value.deskScope ?? ['dashboard', ...pickableDesks]);
    if (on) current.add(deskId);
    else current.delete(deskId);
    current.add('dashboard');
    onChange({ ...value, deskScope: [...current] });
  };

  const setExpiry = (v: string) => {
    onChange({ ...value, roleExpiresAt: fromDateInput(v) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
          {t('org.access.editor.templateLabel')}
        </label>
        <select
          value={value.templateId ?? '__custom__'}
          onChange={(e) => pickTemplate(e.target.value)}
          className={`${inputCls} cursor-pointer`}
        >
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {t(tpl.nameKey)}
            </option>
          ))}
          <option value="__custom__">{t('org.access.editor.customRole')}</option>
        </select>
        {template ? (
          <p className="text-[11px] text-stone-500 mt-1.5">{t(template.descKey)}</p>
        ) : (
          <div className="mt-2">
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
              {t('org.access.editor.roleLabel')}
            </label>
            <select
              value={resolveEdgeRole(value.role)}
              onChange={(e) => pickRole(e.target.value)}
              className={`${inputCls} cursor-pointer`}
            >
              {grantableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
        <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={scopeOpen}
            onChange={(e) => {
              setScopeOpen(e.target.checked);
              if (!e.target.checked) onChange({ ...value, deskScope: null });
              else if (value.deskScope == null)
                onChange({ ...value, deskScope: ['dashboard', ...pickableDesks] });
            }}
            className="w-4 h-4 accent-amber-600"
          />
          <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-600" />
            {t('org.access.editor.scopeToggle')}
          </span>
        </label>
        {scopeOpen && (
          <div className="mt-2">
            <p className="text-[11px] text-stone-500 mb-2">{t('org.access.editor.scopeHint')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400 px-2 py-2">
                <Lock size={11} /> {t('org.access.editor.homeAlways')}
              </span>
              {pickableDesks.map((id) => {
                const mod = MODULE_CATALOG.find((m) => m.id === id);
                const checked = value.deskScope == null || value.deskScope.includes(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 px-2 py-2 bg-white border border-stone-200 rounded-lg cursor-pointer min-h-[36px]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleDesk(id, e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-600"
                    />
                    <span className="truncate">{mod?.name || id}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {template?.scopeRequired && errors.includes('SCOPE_REQUIRED') && (
          <p className="text-[11px] font-bold text-red-600 mt-2">
            {t('org.access.editor.scopeRequired')}
          </p>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
          <span className="flex items-center gap-1.5">
            <CalendarClock size={12} /> {t('org.access.editor.expiryLabel')}
          </span>
        </label>
        <input
          type="date"
          value={toDateInput(value.roleExpiresAt)}
          onChange={(e) => setExpiry(e.target.value)}
          className={`${inputCls} cursor-pointer`}
        />
        <p className="text-[11px] text-stone-400 mt-1">{t('org.access.editor.expiryHint')}</p>
        {errors.includes('EXPIRY_IN_PAST') && (
          <p className="text-[11px] font-bold text-red-600 mt-1">
            {t('org.access.editor.expiryPast')}
          </p>
        )}
      </div>
    </div>
  );
};
