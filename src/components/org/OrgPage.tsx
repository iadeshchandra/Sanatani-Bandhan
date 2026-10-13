/**
 * OrgPage — public organisation page (Membership sprint).
 * ==========================================================================
 * Every organisation appears on the social layer as a Page: cover, logo,
 * name + Official seal, org-type chip, about, follower/member counts,
 * Follow + Request to Join. Org-type-agnostic copy throughout.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, MapPin, Users, UserPlus, Bell, BellOff, ArrowLeft,
  Loader2, Landmark, CalendarDays, Megaphone,
} from 'lucide-react';
import { useMembership } from '../../context/MembershipContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { orgTypeLabel, OrgPage as OrgPageType } from '../../types/membership';
import { JoinRequestModal } from './JoinRequestModal';

export const OrgPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { getOrgPage, isFollowing, toggleFollow, followerCount, myMemberships } = useMembership();
  const { firebaseUser } = useAuthWorkspace();

  const [page, setPage] = useState<OrgPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    (async () => {
      const p = await getOrgPage(orgId);
      setPage(p);
      setLoading(false);
      if (p) {
        setFollowers(await followerCount(orgId));
      }
    })();
  }, [orgId, getOrgPage, followerCount]);

  const isMember = page ? myMemberships.some((m) => m.workspaceId === page.orgId) : false;
  const following = page ? isFollowing(page.orgId) : false;

  const handleFollow = async () => {
    if (!page || busy) return;
    if (!firebaseUser) {
      alert('Please sign in to follow organisations.');
      return;
    }
    setBusy(true);
    try {
      await toggleFollow(page);
      setFollowers(await followerCount(page.orgId));
    } catch { /* toast already shown */ } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-amber-600" size={32} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6 text-center">
        <Landmark size={48} className="text-stone-300 mb-4" />
        <h1 className="text-xl font-black text-stone-800">Organisation not found</h1>
        <p className="text-sm text-stone-500 mt-2">This page may not be published yet.</p>
        <button
          onClick={() => navigate('/orgs')}
          className="mt-6 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm min-h-[44px]"
        >
          Browse organisations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Cover */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-amber-700 via-orange-800 to-stone-900 overflow-hidden">
        {page.coverUrl ? (
          <img src={page.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #fbbf24 0, transparent 40%), radial-gradient(circle at 70% 80%, #f97316 0, transparent 40%)' }} />
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Identity card */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 -mt-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white text-3xl font-black shadow-lg -mt-16 sm:-mt-20 border-4 border-white overflow-hidden shrink-0">
              {page.logoUrl ? <img src={page.logoUrl} alt="" className="w-full h-full object-cover" /> : <Landmark size={40} />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2 flex-wrap">
                {page.name}
                {page.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    <BadgeCheck size={14} /> Official
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                  {orgTypeLabel(page.type)}
                </span>
                {page.city && (
                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    <MapPin size={12} /> {page.city}{page.state ? `, ${page.state}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {page.about && <p className="text-sm text-stone-600 mt-4 leading-relaxed">{page.about}</p>}

          <div className="flex items-center gap-5 mt-4 text-xs font-bold text-stone-500">
            <span className="flex items-center gap-1.5"><Bell size={14} /> {followers.toLocaleString()} followers</span>
            <span className="flex items-center gap-1.5"><Users size={14} /> {(page.memberCount || 0).toLocaleString()} members</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              onClick={handleFollow}
              disabled={busy}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all min-h-[44px] ${
                following
                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
              }`}
            >
              {following ? <BellOff size={16} /> : <Bell size={16} />}
              {following ? 'Following' : 'Follow'}
            </button>
            {!isMember ? (
              <button
                onClick={() => {
                  if (!firebaseUser) {
                    alert('Please sign in to request membership.');
                    return;
                  }
                  setShowJoinModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-white border-2 border-amber-600 text-amber-700 hover:bg-amber-50 transition-all min-h-[44px]"
              >
                <UserPlus size={16} /> Request to Join
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-emerald-50 border border-emerald-200 text-emerald-700">
                <BadgeCheck size={16} /> You are a member
              </div>
            )}
          </div>
          {following && (
            <p className="text-[11px] text-stone-400 mt-2 text-center">
              You’ll see {page.name}’s announcements in your feed.
            </p>
          )}
        </div>

        {/* Upcoming gatherings — populated by trustees later; honest empty state */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-amber-600" /> Upcoming gatherings
          </h2>
          <p className="text-xs text-stone-400">
            {page.name} hasn’t published upcoming gatherings yet. Follow the page to be notified.
          </p>
        </div>

        {/* Announcements — populated by trustees later; honest empty state */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-3">
            <Megaphone size={16} className="text-amber-600" /> Announcements
          </h2>
          <p className="text-xs text-stone-400">No announcements yet.</p>
        </div>
      </div>

      {showJoinModal && page && (
        <JoinRequestModal page={page} onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  );
};
