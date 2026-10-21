import React, { useState, useMemo } from 'react';
import {
  HeartHandshake, MessageCircle, Clock, CalendarHeart, PhoneOff,
  CheckCircle2, History, Settings2, Gift,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { WindowedNotice } from '../common/WindowedNotice';

interface DonorProfile {
  key: string;
  name: string;
  phone: string;
  firstDonation: string;
  lastDonation: string;
  total: number;
  count: number;
}

interface ThanksEntry {
  at: string;
  by: string;
  channel: 'WhatsApp' | 'In person' | 'Phone call' | 'Note';
}

const THANKS_KEY = (wsId: string) => `sb_donor_thanks_${wsId}`;

function loadThanks(wsId: string): Record<string, ThanksEntry> {
  try {
    return JSON.parse(localStorage.getItem(THANKS_KEY(wsId)) || '{}');
  } catch {
    return {};
  }
}

function waMeLink(phone: string, message: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

const DAY = 86400000;

export const DonorCareDesk: React.FC = () => {
  const { t } = useLanguage();
  const { treasury, devotees } = useData();
  const { activeWorkspace, currentUser } = useAuthWorkspace();
  const taxonomy = useWorkspaceTaxonomy();
  const { showToast } = useToast();
  const wsId = activeWorkspace?.id || 'default';
  const orgName = activeWorkspace?.name || 'our organisation';

  const [lapsedDays, setLapsedDays] = useState(90);
  const [thanks, setThanks] = useState<Record<string, ThanksEntry>>(() => loadThanks(wsId));
  const [logFor, setLogFor] = useState<string | null>(null);
  const [logChannel, setLogChannel] = useState<ThanksEntry['channel']>('WhatsApp');

  const phoneByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of devotees || []) {
      const nm = (d as any).name || (d as any).fullName;
      if (nm && (d as any).phone) m.set(String(nm).toLowerCase(), (d as any).phone);
    }
    return m;
  }, [devotees]);

  const donors = useMemo<DonorProfile[]>(() => {
    const map = new Map<string, DonorProfile>();
    for (const t of treasury || []) {
      if (t.type !== 'Income') continue;
      const name = t.devoteeName || (t as any).donorName || 'Anonymous';
      if (name === 'Anonymous') continue;
      const key = t.devoteeId || name.toLowerCase();
      const cur = map.get(key) || {
        key, name,
        phone: phoneByName.get(name.toLowerCase()) || '',
        firstDonation: t.date, lastDonation: t.date, total: 0, count: 0,
      };
      if (t.date < cur.firstDonation) cur.firstDonation = t.date;
      if (t.date > cur.lastDonation) cur.lastDonation = t.date;
      cur.total += Number(t.amount) || 0;
      cur.count += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [treasury, phoneByName]);

  const now = Date.now();
  const daysSince = (iso: string) => Math.floor((now - new Date(iso).getTime()) / DAY);

  const needsThanks = useMemo(
    () => donors.filter((d) => daysSince(d.lastDonation) <= 14 && !thanks[d.key]),
    [donors, thanks]
  );
  const lapsed = useMemo(
    () => donors.filter((d) => daysSince(d.lastDonation) > lapsedDays),
    [donors, lapsedDays]
  );
  const anniversaries = useMemo(() => {
    return donors
      .map((d) => {
        const first = new Date(d.firstDonation);
        const thisYear = new Date(now).getFullYear();
        const anniv = new Date(thisYear, first.getMonth(), first.getDate());
        if (anniv.getTime() < now - 7 * DAY) anniv.setFullYear(thisYear + 1);
        const inDays = Math.round((anniv.getTime() - now) / DAY);
        const years = anniv.getFullYear() - first.getFullYear();
        return { donor: d, inDays, years, date: anniv };
      })
      .filter((a) => a.inDays >= -7 && a.inDays <= 30 && a.years >= 1)
      .sort((a, b) => a.inDays - b.inDays);
  }, [donors, now]);

  const logThanks = (donorKey: string) => {
    const entry: ThanksEntry = {
      at: new Date().toISOString(),
      by: (currentUser as any)?.name || 'Sevadar',
      channel: logChannel,
    };
    const next = { ...thanks, [donorKey]: entry };
    setThanks(next);
    try {
      localStorage.setItem(THANKS_KEY(wsId), JSON.stringify(next));
    } catch { /* private mode */ }
    setLogFor(null);
    showToast('Thank-you logged. Dhanyavaad! 🙏', 'success');
  };

  const msg = {
    thanks: (d: DonorProfile) =>
      `🙏 Dhanyavaad ${d.name}! Your generous contribution of ₹${d.total.toLocaleString('en-IN')} to ${orgName} means so much. With gratitude!`,
    winback: (d: DonorProfile) =>
      `🙏 Namaste ${d.name}, we miss you at ${orgName}! It has been ${daysSince(d.lastDonation)} days since your last visit. We would love to see you again — do drop by for darshan.`,
    anniversary: (d: DonorProfile, years: number) =>
      `🙏 ${d.name}, ${years} year${years > 1 ? 's' : ''} ago you made your first contribution to ${orgName}. Thank you for walking this journey with us!`,
  };

  const DonorCard: React.FC<{ d: DonorProfile; kind: 'thanks' | 'lapsed' | 'anniversary'; extra?: string }> = ({ d, kind, extra }) => {
    const wa = d.phone ? waMeLink(d.phone, kind === 'thanks' ? msg.thanks(d) : kind === 'lapsed' ? msg.winback(d) : msg.anniversary(d, Number(extra) || 1)) : '';
    const thanked = thanks[d.key];
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-slate-900">{d.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {d.count} donation{d.count > 1 ? 's' : ''} · ₹{d.total.toLocaleString('en-IN')} total · last {new Date(d.lastDonation).toLocaleDateString('en-IN')}
            </p>
            {extra && <p className="text-xs font-bold text-rose-600 mt-1">{extra}</p>}
          </div>
          {thanked && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
              <CheckCircle2 className="w-3 h-3" /> Thanked {new Date(thanked.at).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
        {!d.phone && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <PhoneOff className="w-3.5 h-3.5" /> No phone on file — add it in the {taxonomy.directoryName} to message directly.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {kind === 'thanks' ? 'Thank on WhatsApp' : kind === 'lapsed' ? 'Win back on WhatsApp' : 'Wish on WhatsApp'}
            </a>
          ) : null}
          {logFor === d.key ? (
            <span className="inline-flex items-center gap-2">
              <select
                value={logChannel}
                onChange={(e) => setLogChannel(e.target.value as ThanksEntry['channel'])}
                className="text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
              >
                <option>WhatsApp</option>
                <option>In person</option>
                <option>{t('org.people.donorCare.phoneCall')}</option>
                <option>Note</option>
              </select>
              <button
                onClick={() => logThanks(d.key)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >{t('org.people.donorCare.save')}</button>
              <button onClick={() => setLogFor(null)} className="text-xs font-bold text-slate-500 px-2">{t('org.people.donorCare.cancel')}</button>
            </span>
          ) : (
            <button
              onClick={() => { setLogFor(d.key); setLogChannel('WhatsApp'); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <History className="w-3.5 h-3.5" /> Log thank-you
            </button>
          )}
        </div>
        {thanked && (
          <p className="text-[11px] text-slate-500">
            Last thanked {new Date(thanked.at).toLocaleDateString('en-IN')} by {thanked.by} via {thanked.channel}.
          </p>
        )}
      </div>
    );
  };

  const Section: React.FC<{ icon: React.ReactNode; title: string; sub: string; count: number; children: React.ReactNode }> =
    ({ icon, title, sub, count, children }) => (
      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">{icon}</div>
          <div>
            <h3 className="font-black text-slate-900">{title} <span className="text-slate-400">· {count}</span></h3>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {count === 0 ? (
            <p className="text-sm text-slate-400 font-medium col-span-2 py-4 text-center">All clear — nothing here right now. 🙏</p>
          ) : children}
        </div>
      </section>
    );

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      {/* F2: donor totals/last-gift below derive from the treasury set;
          in windowed mode that set is partial — labelled honestly. */}
      <WindowedNotice collection="treasury" variant="totals" loaded={treasury.length} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-rose-600" />{t('org.people.donorCare.donorCare')}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Thank donors personally, win back the lapsed, and never miss an anniversary.
            Messages open as personal WhatsApp chats — no bulk automation, no spam.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
          <Settings2 className="w-4 h-4" /> Lapsed after
          <input
            type="number" min={7} max={365} value={lapsedDays}
            onChange={(e) => setLapsedDays(Math.max(7, Number(e.target.value) || 90))}
            className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-black"
          />
          days
        </label>
      </div>

      <Section
        icon={<Gift className="w-5 h-5 text-emerald-600" />}
        title="Needs a Thank-You"
        sub="Donated in the last 14 days and not yet thanked"
        count={needsThanks.length}
      >
        {needsThanks.map((d) => <DonorCard key={d.key} d={d} kind="thanks" />)}
      </Section>

      <Section
        icon={<Clock className="w-5 h-5 text-amber-600" />}
        title="Lapsed Donors"
        sub={`No donation in over ${lapsedDays} days — a personal note goes a long way`}
        count={lapsed.length}
      >
        {lapsed.map((d) => <DonorCard key={d.key} d={d} kind="lapsed" extra={`${daysSince(d.lastDonation)} days since last donation`} />)}
      </Section>

      <Section
        icon={<CalendarHeart className="w-5 h-5 text-rose-600" />}
        title="Upcoming Anniversaries"
        sub="First-donation anniversaries in the next 30 days"
        count={anniversaries.length}
      >
        {anniversaries.map(({ donor: d, inDays, years, date }) => (
          <DonorCard
            key={d.key}
            d={d}
            kind="anniversary"
            extra={`${years} year${years > 1 ? 's' : ''} · ${inDays <= 0 ? 'today!' : `in ${inDays} day${inDays > 1 ? 's' : ''} (${date.toLocaleDateString('en-IN')})`}`}
          />
        ))}
      </Section>
    </div>
  );
};

export default DonorCareDesk;
