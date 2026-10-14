import React from 'react';
import { useMatha, paramparaRoots, shishyasOf, displayName } from './mathaStore';
import { Sannyasi } from './types';
import { T, Card, Empty, fmtDate } from './ui';

/* Parampara — guru-shishya lineage as a respectful nested tree. */

const Node: React.FC<{ s: Sannyasi; depth: number }> = ({ s, depth }) => {
  const { state } = useMatha();
  const kids = shishyasOf(state, s.id);
  return (
    <div className={depth > 0 ? 'ml-5 sm:ml-8 mt-2 border-l-2 border-orange-200 pl-4' : 'mt-2'}>
      <div className="bg-orange-50/70 border border-orange-100 rounded-xl px-3 py-2">
        <div className="font-bold text-stone-800 text-sm">🙏 {displayName(s)}</div>
        <div className="text-xs text-stone-500">
          {s.dikshaDate ? <>{fmtDate(s.dikshaDate)} · </> : null}
          {s.parampara || '—'}
          {s.status === 'mahasamadhi' ? ' · Mahasamadhi' : ''}
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
  const roots = paramparaRoots(state);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-extrabold text-stone-800 mb-1">
          <T en="Guru-shishya parampara" bn="গুরু-শিষ্য পরম্পরা" hi="गुरु-शिष्य परंपरा" />
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          <T
            en="Built from each sannyasi's recorded diksha guru. Set the guru in the Sannyasi tab to grow the tree."
            bn="প্রতিটি সন্ন্যাসীর নথিভুক্ত দীক্ষা গুরু থেকে তৈরি। গাছ বাড়াতে সন্ন্যাসী ট্যাবে গুরু নির্ধারণ করুন।"
            hi="प्रत्येक संन्यासी के दर्ज दीक्षा गुरु से निर्मित। वृक्ष बढ़ाने के लिए संन्यासी टैब में गुरु निर्धारित करें।"
          />
        </p>
        {roots.length === 0 && <Empty text="No sannyasis in the registry yet." />}
        <div className="space-y-3">
          {roots.map((r) => (
            <Node key={r.id} s={r} depth={0} />
          ))}
        </div>
      </Card>
    </div>
  );
};
