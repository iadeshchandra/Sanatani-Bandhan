import React, { useState } from 'react';
import {
  Shield,
  Key,
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Edit3,
  X,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { ROLE_PERMISSIONS, Role, Permission } from '../../security/rbac';
import { useToast } from '../../context/ToastContext';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: 'Active' | 'On Leave';
}

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'usr-1',
    name: 'Acharya Vidyasagar Shastri',
    email: 'vidyasagar.shastri@mandir.internal',
    role: 'Trustee',
    department: 'Apex Dharmic Trust Council',
    status: 'Active',
  },
  {
    id: 'usr-2',
    name: 'Shri Ramratan Agarwal',
    email: 'ramratan.agarwal@mandir.internal',
    role: 'Trustee',
    department: 'Board of Custodians',
    status: 'Active',
  },
  {
    id: 'usr-3',
    name: 'CA Priya Sundaram',
    email: 'priya.sundaram@mandir.internal',
    role: 'Accountant',
    department: 'Treasury & Statutory Audit',
    status: 'Active',
  },
  {
    id: 'usr-4',
    name: 'Pandit Devendra Joshi',
    email: 'devendra.joshi@mandir.internal',
    role: 'Priest',
    department: 'Garbhagriha & Nitya Puja',
    status: 'Active',
  },
  {
    id: 'usr-5',
    name: 'Mohan Lal Verma',
    email: 'mohan.verma@mandir.internal',
    role: 'Sevadar',
    department: 'Annadanam & Crowd Seva',
    status: 'Active',
  },
];

export const UserRolesDesk: React.FC = () => {
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedRole, setEditedRole] = useState<Role>('Sevadar');

  const handleOpenEdit = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setEditedRole(staff.role);
    setIsEditModalOpen(true);
  };

  const handleSaveRole = () => {
    if (!selectedStaff) return;
    setStaffList((prev) =>
      prev.map((s) => (s.id === selectedStaff.id ? { ...s, role: editedRole } : s))
    );
    showToast(`Access matrix updated for ${selectedStaff.name} -> ${editedRole}`, 'success');
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
              Identity & Access Management (IAM)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
              Granular Policy Matrix
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            RBAC 2.0 & Staff Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enforce least-privilege security across temple accountants, priests, trustees, and ground sevadars.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span>{staffList.length} Active Staff Custodians</span>
          </div>
        </div>
      </div>

      {/* 2. Staff Governance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Assigned Temple Roles & Active Capability Badges
            </h3>
            <p className="text-xs text-slate-500">
              Permissions are evaluated dynamically on each desk action through high-order security guards.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            Zero Trust Architecture
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Staff Custodian</th>
                <th className="px-4 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Granted Capability Matrix</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Governance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((member) => {
                const perms = ROLE_PERMISSIONS[member.role] || [];

                return (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 text-sm">{member.name}</div>
                      <div className="text-[11px] text-slate-500">{member.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{member.department}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                          member.role === 'SuperAdmin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : member.role === 'Trustee'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : member.role === 'Accountant'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : member.role === 'Priest'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-md">
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((perm) => (
                          <span
                            key={perm}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-mono font-semibold border border-indigo-100/60"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(member)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs transition-colors cursor-pointer border border-slate-200"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Access Matrix</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Edit Access Matrix Modal */}
      {isEditModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Edit Role & Access Permissions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <p className="font-bold text-slate-900 text-sm">{selectedStaff.name}</p>
                <p className="text-slate-500">{selectedStaff.email}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedStaff.department}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Security Role
                </label>
                <select
                  value={editedRole}
                  onChange={(e) => setEditedRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Trustee">Trustee (Fiduciary & Oversight)</option>
                  <option value="Accountant">Accountant (Treasury & Audit Only)</option>
                  <option value="Priest">Priest (Rituals & Devotee Desk)</option>
                  <option value="Sevadar">Sevadar (Ground Logistics & Registration)</option>
                </select>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Permissions Included with this Role:
                </p>
                <div className="flex flex-wrap gap-1.5 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  {ROLE_PERMISSIONS[editedRole].map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded-md bg-white text-indigo-800 text-[10px] font-mono font-bold shadow-2xs border border-indigo-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                Save Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRolesDesk;
