import React from 'react';
import { useMatha, paramparaRoots, shishyasOf, displayName } from './mathaStore';
import { Sannyasi } from './types';
import { Card, Empty, fmtDate } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Parampara — guru-shishya lineage as a respectful nested tree. */

const Node: React.FC<{ s: Sannyasi; depth: number }> = ({ s, depth }) => {
  const { state } = useMatha();
  const { t } = useLanguage();
  const kids = shishyasOf(state, s.id);
  return (
    <div className={depth > 0 ? 'ml-5 sm:ml-8 mt-2 border-l-2 border-orange-200 pl-4' : 'mt-2'}>
      <div className="bg-orange-50/70 border border-orange-100 rounded-xl px-3 py-2">
        <div className="font-bold text-stone-800 text-sm">🙏 {displayName(s)}</div>
        <div className="text-xs text-stone-500">
          {s.dikshaDate ? <>{fmtDate(s.dikshaDate)} · </> : null}
          {s.parampara || '—'}
          {s.status === 'mahasamadhi' ? ` · ${t('suites.matha.common.status.mahasamadhi')}` : ''}
        </div>
      </div>
      {kids.map((k) => (
        <Node key={k.id} s={k} depth={depth + 1} />
      ))}
    </div>
  );
};

export const ParamparaTab: React.FC = () => {
  const { state } = useMatha();
  const { t } = useLanguage();
  const roots = paramparaRoots(state);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-extrabold text-stone-800 mb-1">
          {t('suites.matha.parampara.title')}
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          {t('suites.matha.parampara.description')}
        </p>
        {roots.length === 0 && <Empty text={t('suites.matha.parampara.empty')} />}
        <div className="space-y-3">
          {roots.map((r) => (
            <Node key={r.id} s={r} depth={0} />
          ))}
        </div>
      </Card>
    </div>
  );
};
