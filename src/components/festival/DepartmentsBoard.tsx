/**
 * DepartmentsBoard — the seva departments board (EVENTS E6).
 * =====================================================================
 * Lives in the War Room beside the sponsors & stalls register.
 * Departments live on the samiti's Utsav festival record (inside
 * the existing utsav_stores doc — no new collection, no rules
 * change), linked the DebriefCard way: matchLocalFestival, date
 * overlap only.
 *
 * WHY NAMES LIVE ON THE DEPARTMENT: the War Room roster
 * (WarRoomPlan.roster in festival_plans) is a role × shift grid
 * keyed to the Panjika festival, while departments belong to the
 * committee's own Utsav record — two stores, two festival
 * identities, joined only by the date-overlap link. Stamping a
 * departmentId onto roster entries would weld the roster to a
 * link that can re-match, and the festival_plans rules posture
 * is not this batch's to touch (E6 changes no rules). So the
 * department carries the committee's own volunteerNames list —
 * honest committee planning data: who has offered for THIS team.
 * Coverage = target vs that list (lib/festivalSponsors), and the
 * same summary feeds the E4 debrief's operations section.
 */
import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUtsav, uid } from '../../utsav/utsavStore';
import { Card, Btn, Field, Empty, inputCls } from '../../utsav/ui';
import type { WarFestival } from '../../lib/festival';
import { matchLocalFestival } from '../../lib/festivalDebrief';
import { departmentCoverage, seedDepartments } from '../../lib/festivalSponsors';
import type { Festival, SevaDepartment } from '../../utsav/types';

interface Props {
  wf: WarFestival;
}

type DeptForm = { name: string; leadName: string; target: string; note: string };
const blankDept: DeptForm = { name: '', leadName: '', target: '4', note: '' };

export const DepartmentsBoard: React.FC<Props> = ({ wf }) => {
  const { t } = useLanguage();
  const { state, update } = useUtsav();

  const linked: Festival | null = useMemo(
    () => matchLocalFestival(wf.dateISO, wf.endDateISO, state.festivals),
    [wf.dateISO, wf.endDateISO, state.festivals]
  );

  const [editing, setEditing] = useState<string | null>(null); // null · 'new' · dept id
  const [form, setForm] = useState<DeptForm>(blankDept);
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});

  const departments = useMemo(() => linked?.departments ?? [], [linked]);
  const coverage = useMemo(() => departmentCoverage(departments), [departments]);

  if (!linked) {
    return (
      <Card>
        <h3 className="font-extrabold text-stone-800 mb-1">🧎 {t('surfaces.events.deptTitle')}</h3>
        <Empty text={t('surfaces.events.regNoFestival')} />
      </Card>
    );
  }

  const save = (next: SevaDepartment[]) => update('festivals', linked.id, { departments: next });

  const seed = () => save(seedDepartments(() => uid('dp')));

  const openDept = (d?: SevaDepartment) => {
    if (d) {
      setForm({
        name: d.name, leadName: d.leadName || '',
        target: String(d.targetVolunteers || ''), note: d.note || '',
      });
      setEditing(d.id);
    } else {
      setForm(blankDept);
      setEditing('new');
    }
  };

  const saveDept = () => {
    const name = form.name.trim();
    if (!name) return;
    const target = Math.max(0, Math.round(Number(form.target) || 0));
    if (editing === 'new') {
      save([...departments, {
        id: uid('dp'), name,
        ...(form.leadName.trim() ? { leadName: form.leadName.trim() } : {}),
        targetVolunteers: target,
        volunteerNames: [],
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }]);
    } else {
      save(departments.map((d) => (d.id === editing
        ? {
            ...d,
            name,
            leadName: form.leadName.trim() || undefined,
            targetVolunteers: target,
            note: form.note.trim() || undefined,
          }
        : d)));
    }
    setEditing(null);
  };

  const addVolunteer = (d: SevaDepartment) => {
    const name = (nameDraft[d.id] || '').trim();
    if (!name) return;
    const names = d.volunteerNames ?? [];
    if (names.some((n) => n.trim().toLowerCase() === name.toLowerCase())) {
      setNameDraft((s) => ({ ...s, [d.id]: '' }));
      return;
    }
    save(departments.map((x) => (x.id === d.id ? { ...x, volunteerNames: [...names, name] } : x)));
    setNameDraft((s) => ({ ...s, [d.id]: '' }));
  };

  const removeVolunteer = (d: SevaDepartment, name: string) => {
    save(departments.map((x) => (x.id === d.id
      ? { ...x, volunteerNames: (x.volunteerNames ?? []).filter((n) => n !== name) }
      : x)));
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-extrabold text-stone-800">🧎 {t('surfaces.events.deptTitle')}</h3>
        <Btn variant="ghost" className="!px-3" onClick={() => openDept()}>
          + {t('surfaces.events.deptAdd')}
        </Btn>
      </div>
      <p className="text-xs text-stone-500 mb-3">{t('surfaces.events.deptIntro')}</p>

      {departments.length > 0 && (
        <p className="text-sm text-stone-600 font-semibold mb-3">
          {t('surfaces.events.deptSummary')
            .replace('{assigned}', String(coverage.totalAssigned))
            .replace('{target}', String(coverage.totalTarget))
            .replace('{gap}', String(coverage.totalGap))}
        </p>
      )}

      {editing !== null && (
        <div className="rounded-xl bg-orange-50/60 border border-orange-100 p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('surfaces.events.deptName')}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.deptLead')}>
              <input className={inputCls} value={form.leadName} onChange={(e) => setForm({ ...form, leadName: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.deptTarget')}>
              <input type="number" min={0} inputMode="numeric" className={inputCls} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.sponsorNote')}>
              <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Btn disabled={!form.name.trim()} onClick={saveDept}>{t('surfaces.events.deptSave')}</Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>{t('surfaces.events.sponsorCancel')}</Btn>
          </div>
        </div>
      )}

      {departments.length === 0 ? (
        editing === null && (
          <div>
            <Empty text={t('surfaces.events.deptEmpty')} />
            <div className="text-center pb-2">
              <Btn onClick={seed}>{t('surfaces.events.deptSeed')}</Btn>
            </div>
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {coverage.rows.map((row) => {
            const d = departments.find((x) => x.id === row.id)!;
            return (
              <li key={row.id} className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-stone-800 truncate">{row.name}</div>
                    <div className="text-[11px] text-stone-500">
                      {row.leadName ? `${t('surfaces.events.deptLead').replace(/\s*\(.*\)\s*$/, '')}: ${row.leadName} · ` : ''}
                      <span className="tnum">{row.assigned} / {row.target}</span> {t('surfaces.events.deptVolunteers')}
                      {d.note ? ` · ${d.note}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {row.covered ? (
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
                        {t('surfaces.events.deptCovered')}
                      </span>
                    ) : (
                      <span className="text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                        {t('surfaces.events.deptGap').replace('{gap}', String(row.gap))}
                      </span>
                    )}
                    <Btn variant="ghost" className="!px-2.5" onClick={() => openDept(d)}>{t('surfaces.events.sponsorEdit')}</Btn>
                    <Btn variant="ghost" className="!px-2.5" onClick={() => save(departments.filter((x) => x.id !== d.id))}>
                      {t('surfaces.events.deptRemove')}
                    </Btn>
                  </div>
                </div>
                {/* The committee's volunteer list for this team. */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(d.volunteerNames ?? []).map((n) => (
                    <span key={n} className="inline-flex items-center gap-1 rounded-full bg-white border border-stone-200 pl-2.5 pr-1 py-1 text-xs font-semibold text-stone-700">
                      {n}
                      <button aria-label={`Remove ${n}`} onClick={() => removeVolunteer(d, n)}
                        className="w-6 h-6 rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50 font-bold">✕</button>
                    </span>
                  ))}
                  {(d.volunteerNames ?? []).length === 0 && (
                    <span className="text-[11px] text-stone-400">{t('surfaces.events.deptNoVolunteers')}</span>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input className={`${inputCls} flex-1`} placeholder={t('surfaces.events.deptVolunteerPlaceholder')}
                    value={nameDraft[d.id] || ''}
                    onChange={(e) => setNameDraft((s) => ({ ...s, [d.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') addVolunteer(d); }} />
                  <Btn className="!px-3" disabled={!(nameDraft[d.id] || '').trim()} onClick={() => addVolunteer(d)}>
                    {t('surfaces.events.deptVolunteerAdd')}
                  </Btn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default DepartmentsBoard;
