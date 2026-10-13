import React, { useState } from 'react';
import { GitBranch, Plus, Pencil, Trash2, Check, X, ShieldCheck, UserPlus, UserMinus } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import type { BranchInfo, BranchMemberAccess } from '../../types';

/**
 * BranchManager — workspace Settings section for multi-branch organisations.
 *
 * Lives in MasterSettingsDesk (admin-only surface). Creating the 2nd branch
 * is what makes the header BranchSwitcher appear; a single-branch workspace
 * otherwise shows zero branch UI anywhere in the operational app.
 */
export const BranchManager: React.FC = () => {
  const { activeWorkspace, updateWorkspaceDetails, checkPermission } = useAuthWorkspace();
  const { getBranchRecordCount, isMultiBranch } = useData();
  const { showToast } = useToast();

  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');

  if (!checkPermission(['SuperAdmin', 'Trustee'])) return null;
  // Demos are single-location sandboxes — branch management is meaningless
  // there and would leak branch UI to visitors.
  if (activeWorkspace.id?.startsWith('DEMO_')) return null;

  const branches: BranchInfo[] = activeWorkspace.branches || [];
  const branchAccess: BranchMemberAccess[] = activeWorkspace.branchAccess || [];

  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberLabel, setNewMemberLabel] = useState('');

  const persistAccess = (next: BranchMemberAccess[]) => {
    updateWorkspaceDetails({ branchAccess: next });
  };

  const handleAddMember = () => {
    const id = newMemberId.trim().toLowerCase();
    if (!id) {
      showToast("Enter the member's login email or user ID.", 'error');
      return;
    }
    if (branchAccess.some((e) => e.memberId.toLowerCase() === id)) {
      showToast('That member already has a branch-access entry.', 'error');
      return;
    }
    persistAccess([
      ...branchAccess,
      {
        memberId: id,
        label: newMemberLabel.trim() || undefined,
        // Start with full access; the Trustee unchecks branches to restrict.
        branchIds: branches.map((b) => b.id),
      },
    ]);
    setNewMemberId('');
    setNewMemberLabel('');
    showToast('Member added — uncheck branches to restrict their access.', 'success');
  };

  const handleRemoveMember = (memberId: string) => {
    persistAccess(branchAccess.filter((e) => e.memberId !== memberId));
    showToast('Member removed from the allowlist — they no longer have branch access.', 'success');
  };

  const toggleMemberBranch = (memberId: string, branchId: string) => {
    const next = branchAccess.map((e) => {
      if (e.memberId !== memberId) return e;
      // Allowlist: an empty/missing list grants NO branches. Toggling adds or
      // removes a single grant; unticking the last branch suspends access.
      const current = e.branchIds || [];
      const has = current.includes(branchId);
      return {
        ...e,
        branchIds: has ? current.filter((id) => id !== branchId) : [...current, branchId],
      };
    });
    persistAccess(next);
  };

  const memberCanSee = (entry: BranchMemberAccess, branchId: string): boolean => {
    // Allowlist: only explicitly ticked branches are visible.
    return !!entry.branchIds && entry.branchIds.includes(branchId);
  };

  const persist = (next: BranchInfo[]) => {
    updateWorkspaceDetails({ branches: next });
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) {
      showToast('Give the branch a name first.', 'error');
      return;
    }
    const branch: BranchInfo = {
      id: `br-${Date.now()}`,
      name,
      city: newCity.trim() || undefined,
      // The first branch added becomes the main location.
      isMain: branches.length === 0,
    };
    persist([...branches, branch]);
    setNewName('');
    setNewCity('');
    showToast(
      branches.length === 0
        ? `"${name}" added as the main location.`
        : `"${name}" added. The branch switcher now appears in the header.`,
      'success'
    );
  };

  const handleRename = (id: string) => {
    const name = editName.trim();
    if (!name) {
      showToast('Give the branch a name first.', 'error');
      return;
    }
    persist(
      branches.map((b) =>
        b.id === id ? { ...b, name, city: editCity.trim() || undefined } : b
      )
    );
    setEditingId(null);
    showToast('Branch renamed.', 'success');
  };

  const handleDelete = (id: string) => {
    const count = getBranchRecordCount(id);
    if (count > 0) {
      showToast(
        `This branch has ${count} record${count === 1 ? '' : 's'} — move or delete them before removing it.`,
        'error'
      );
      return;
    }
    const target = branches.find((b) => b.id === id);
    let next = branches.filter((b) => b.id !== id);
    // Never leave the workspace without a main branch.
    if (target?.isMain && next.length > 0 && !next.some((b) => b.isMain)) {
      next = next.map((b, i) => (i === 0 ? { ...b, isMain: true } : b));
    }
    persist(next);
    showToast('Branch removed.', 'success');
  };

  return (
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center justify-between mb-1">
        <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
          <GitBranch size={14} /> Branches
        </h5>
        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
          {branches.length === 0 ? 'Single location' : `${branches.length} locations`}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 font-medium mb-4 leading-relaxed">
        {branches.length < 2
          ? 'Run this organisation across multiple locations. Add a second branch and a branch switcher appears in the header, with a consolidated "All branches" view.'
          : 'Switch locations from the header. "All branches" shows the consolidated view across every location.'}
      </p>

      {branches.length > 0 && (
        <ul className="space-y-2 mb-4">
          {branches.map((b) => {
            const recordCount = getBranchRecordCount(b.id);
            const isEditing = editingId === b.id;
            return (
              <li
                key={b.id}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5"
              >
                <GitBranch size={14} className="text-amber-600 shrink-0" />
                {isEditing ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 min-w-0 text-sm font-bold text-gray-900 bg-transparent outline-none border-b border-amber-300"
                      placeholder="Branch name"
                    />
                    <input
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-24 text-sm text-gray-600 bg-transparent outline-none border-b border-amber-300"
                      placeholder="City"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(b.id)}
                      className="p-1.5 rounded-lg text-green-700 hover:bg-green-50 cursor-pointer"
                      title="Save"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-gray-900 truncate">
                        {b.name}
                        {b.isMain && (
                          <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600">
                            Main
                          </span>
                        )}
                      </span>
                      {b.city && (
                        <span className="block text-[11px] text-gray-500">{b.city}</span>
                      )}
                    </span>
                    {isMultiBranch && (
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                        {recordCount} record{recordCount === 1 ? '' : 's'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(b.id);
                        setEditName(b.name);
                        setEditCity(b.city || '');
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
                      title="Rename branch"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      title={
                        recordCount > 0
                          ? `Cannot delete — ${recordCount} records reference this branch`
                          : 'Delete branch'
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={branches.length === 0 ? 'Main location name (e.g. Kashi Temple)' : 'New branch name (e.g. Ayodhya Temple)'}
          className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
        />
        <input
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          placeholder="City (optional)"
          className="sm:w-36 p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
        >
          <Plus size={16} /> Add branch
        </button>
      </div>

      {/* Per-branch RBAC (v2): restrict members to specific branches. */}
      {isMultiBranch && (
        <div className="mt-5 pt-5 border-t border-amber-200/70">
          <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <ShieldCheck size={14} /> Branch access
          </h5>
          <p className="text-[11px] text-gray-500 font-medium mb-4 leading-relaxed">
            Branch allowlist — only members listed below can see branch records.
            Anyone not listed sees no branch data (deny-by-default). Tick
            branches to grant access; untick every branch to suspend a member
            without removing them. Enforced in the data layer, not just the UI.
          </p>

          {branchAccess.length > 0 && (
            <ul className="space-y-2 mb-4">
              {branchAccess.map((entry) => (
                <li
                  key={entry.memberId}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-gray-900 truncate">
                        {entry.label || entry.memberId}
                      </span>
                      {entry.label && (
                        <span className="block text-[11px] text-gray-500 truncate">{entry.memberId}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(entry.memberId)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Remove member (revokes all branch access)"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((b) => {
                      const checked = memberCanSee(entry, b.id);
                      return (
                        <label
                          key={b.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors min-h-[36px] ${
                            checked
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMemberBranch(entry.memberId, b.id)}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                          {b.name}
                        </label>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="Member login email or user ID"
              className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
            />
            <input
              value={newMemberLabel}
              onChange={(e) => setNewMemberLabel(e.target.value)}
              placeholder="Name (optional)"
              className="sm:w-36 p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
            />
            <button
              type="button"
              onClick={handleAddMember}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              <UserPlus size={16} /> Add member
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManager;
