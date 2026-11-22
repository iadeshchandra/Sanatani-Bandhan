/**
 * ShareInvitePanel — outreach packs for organisers (EVENTS E8).
 * =====================================================================
 * Ready WhatsApp messages composed from the festival's REAL data
 * (name, dates, organisation, the canonical public page link) in
 * three moments: announcement, a days-aware gentle reminder, and
 * the last call. Copy one, or open it in WhatsApp — either way the
 * message is sent from the ORGANISER'S OWN WhatsApp, to people
 * they choose there. The panel says so in plain words, and looks
 * nothing like the WhatsApp Broadcaster desk (which stays labelled
 * a simulation): this is one person inviting people they know,
 * which is real today.
 */
import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { T, Card, Btn } from '../../utsav/ui';
import { festivalEventUrl, type WarFestival, type WarRoomPlan } from '../../lib/festival';
import {
  buildOutreachMessage, datesLineFor, daysBeforeFor, whatsAppUrl,
  type OutreachStrings, type OutreachTone,
} from '../../lib/outreachPacks';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
}

const TONES: { id: OutreachTone; key: string }[] = [
  { id: 'announcement', key: 'shareToneAnnouncement' },
  { id: 'reminder', key: 'shareToneReminder' },
  { id: 'lastcall', key: 'shareToneLastCall' },
];

export const ShareInvitePanel: React.FC<Props> = ({ wf, plan }) => {
  const { t, language } = useLanguage();
  const { activeWorkspace } = useAuthWorkspace();
  const [tone, setTone] = useState<OutreachTone>('announcement');
  const [copied, setCopied] = useState(false);

  const lang = (language || 'en').slice(0, 2);
  const festivalName = lang === 'bn' ? wf.name.bn : lang === 'hi' ? wf.name.hi : wf.name.en;
  const link = festivalEventUrl(window.location.origin, activeWorkspace.id, plan.id);

  const strings: OutreachStrings = useMemo(() => ({
    announcement: t('surfaces.events.shareMsgAnnouncement'),
    reminder: t('surfaces.events.shareMsgReminder'),
    reminderWhenDays: t('surfaces.events.shareMsgWhenDays'),
    reminderWhenTomorrow: t('surfaces.events.shareMsgWhenTomorrow'),
    reminderWhenToday: t('surfaces.events.shareMsgWhenToday'),
    lastCall: t('surfaces.events.shareMsgLastCall'),
    invite: t('surfaces.events.shareMsgInvite'),
  }), [t]);

  const message = useMemo(
    () => buildOutreachMessage(tone, {
      festivalName,
      orgName: activeWorkspace.name || '',
      datesLine: datesLineFor(wf.dateISO, wf.endDateISO),
      link,
      daysBefore: daysBeforeFor(wf.dateISO, Date.now()),
    }, strings),
    [tone, festivalName, activeWorkspace.name, wf.dateISO, wf.endDateISO, link, strings]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    window.open(whatsAppUrl(message), '_blank', 'noopener');
  };

  return (
    <Card>
      <h3 className="font-extrabold text-stone-800 mb-1">
        📣 {t('surfaces.events.sharePanelTitle')}
      </h3>
      <p className="text-xs text-stone-500 mb-2">
        {t('surfaces.events.sharePanelIntro')}
      </p>
      {/* The honesty line: whose WhatsApp, whose recipients. */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 mb-3">
        <span className="text-xs font-bold text-emerald-800">
          {t('surfaces.events.shareOwnWhatsApp')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={t('surfaces.events.sharePanelTitle')}>
        {TONES.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={tone === x.id}
            onClick={() => setTone(x.id)}
            className={`px-3.5 py-2 rounded-xl border-2 text-xs font-bold min-h-[44px] transition ${
              tone === x.id
                ? 'border-orange-600 bg-orange-50 text-orange-900'
                : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            {t(`surfaces.events.${x.key}`)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-stone-50 border border-stone-100 px-4 py-3 mb-3">
        <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-line">{message}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Btn onClick={openWhatsApp}>
          {t('surfaces.events.shareOpenWhatsApp')}
        </Btn>
        <Btn variant="ghost" onClick={copy}>
          {copied
            ? t('surfaces.events.shareCopied')
            : t('surfaces.events.shareCopy')}
        </Btn>
      </div>
      <p className="text-[11px] text-stone-400 mt-2">
        <T en="The link in the message is this festival's own public page."
          bn="বার্তার লিংকটি এই উৎসবের নিজের পাবলিক পৃষ্ঠা।"
          hi="संदेश का लिंक इस उत्सव का अपना सार्वजनिक पृष्ठ है।" />
      </p>
    </Card>
  );
};

export default ShareInvitePanel;
