import React, { useState } from 'react';
import {
  Building2,
  ArrowRight,
  Lock,
  Shield,
  CheckCircle2,
  Sparkles,
  MapPin,
  ChevronRight,
  UserCheck,
  Landmark,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { UserRole } from '../../types';

export interface TenantAffiliation {
  id: string;
  name: string;
  location: string;
  role: UserRole;
  code: string;
  sampradaya: string;
  badgeColor: string;
}

const MOCK_AFFILIATIONS: TenantAffiliation[] = [
  {
    id: 'DEMO_ws-mandir',
    name: 'Kashi Vishwanath Trust & Temple',
    location: 'Varanasi, Uttar Pradesh',
    role: 'Trustee',
    code: 'MND-KSH-108',
    sampradaya: 'Shaiva / Smartha',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'DEMO_ws-samiti',
    name: 'Ayodhya Seva Samiti & Dharmada',
    location: 'Ayodhya, Uttar Pradesh',
    role: 'Accountant',
    code: 'TR-AYD-440',
    sampradaya: 'Ramanandi Vaishnava',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'DEMO_ws-goshala',
    name: 'Surabhi Gau Seva Dham & Ashram',
    location: 'Vrindavan, Uttar Pradesh',
    role: 'Sevadar',
    code: 'GSH-VRN-882',
    sampradaya: 'Gaudiya Vaishnava',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'DEMO_ws-vidyapeeth',
    name: 'Shree Somnath Sanskrit Gurukul',
    location: 'Prabhas Patan, Gujarat',
    role: 'Priest',
    code: 'GRK-SMN-301',
    sampradaya: 'Pashupata Shaivism',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
  },
];

export const SmartLoginRouter: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsRole, switchWorkspace } = useAuthWorkspace();
  const [selectedTenantId, setSelectedTenantId] = useState<string>(MOCK_AFFILIATIONS[0].id);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const userIdentifier = 'trustee@sanatanibandhan.internal';

  const handleTenantSelect = async (tenant: TenantAffiliation) => {
    setIsAuthenticating(true);
    setSelectedTenantId(tenant.id);

    try {
      // 1. Switch context workspace & authenticate persona role
      if (switchWorkspace) {
        await switchWorkspace(tenant.id);
      }
      loginAsRole(tenant.role, tenant.name);

      // 2. Intelligent Role-Based Routing Dispatch
      setTimeout(() => {
        switch (tenant.role) {
          case 'SuperAdmin':
          case 'Trustee':
            navigate('/admin');
            break;
          case 'Accountant':
            navigate('/treasury');
            break;
          case 'Priest':
            navigate('/puja');
            break;
          case 'Sevadar':
            navigate('/scanner');
            break;
          default:
            navigate('/');
            break;
        }
      }, 350);
    } catch (err) {
      console.error('Smart login error:', err);
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 p-6 sm:p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-white/20 backdrop-blur-xs border border-white/30 tracking-wider">
              Tenant Discovery Gateway
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold bg-black/20 px-3 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5 text-amber-200" />
              <span>Zero Trust SSO</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Select Your Mandir Workspace
          </h1>
          <p className="text-amber-100 text-xs sm:text-sm mt-1">
            Multiple organizational affiliations detected for your credentials.
          </p>

          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-200" />
              <span className="font-mono font-medium">{userIdentifier}</span>
            </div>
            <span className="text-[11px] text-amber-200 font-bold">
              {MOCK_AFFILIATIONS.length} Affiliations Found
            </span>
          </div>
        </div>

        {/* Tenant Affiliation Selection List */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Click Organization to Launch Operational Desk:
          </div>

          <div className="space-y-3">
            {MOCK_AFFILIATIONS.map((tenant) => {
              const isSelected = selectedTenantId === tenant.id;

              return (
                <div
                  key={tenant.id}
                  onClick={() => !isAuthenticating && handleTenantSelect(tenant)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-amber-800 transition-colors">
                          {tenant.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${tenant.badgeColor}`}
                        >
                          Role: {tenant.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {tenant.location}
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono text-[11px] text-slate-400">{tenant.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-800'
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              RBAC 2.0 Dynamic Smart Route Enforced
            </span>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-slate-600 hover:text-slate-900 font-bold transition-colors cursor-pointer"
            >
              &larr; Return to Public Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartLoginRouter;
