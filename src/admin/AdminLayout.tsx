import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  ExternalLink,
  Bell,
  Search,
  Activity,
} from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Global Analytics', path: '/admin/analytics', icon: Activity },
  { name: 'Tenants & Mandirs', path: '/admin/tenants', icon: Building2, badge: '12' },
  { name: 'Users & Roles', path: '/admin/users', icon: Users },
  { name: 'Platform Settings', path: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-black shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-slate-900 text-base tracking-tight block leading-tight">
                  Sanatani Bandhan
                </span>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">
                  Super Admin Control Plane
                </span>
              </div>
            </Link>
            <span className="hidden md:inline-block h-5 w-px bg-slate-200"></span>
            <span className="hidden md:inline-block text-xs font-medium text-slate-500">
              Multi-Tenant Cloud Infrastructure
            </span>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Return to Main Application"
            >
              <span>View Mandir App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative"
              title="Platform Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500"></span>
            </button>

            {/* User Profile Dropdown Mock */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  SA
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-bold text-slate-800 block leading-none">
                    Root Trustee
                  </span>
                  <span className="text-[10px] text-slate-500 leading-none">
                    superadmin@mandir
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-800">Super Administrator</p>
                    <p className="text-slate-400 text-[11px] truncate">root@sanatanibandhan.internal</p>
                  </div>
                  <Link
                    to="/admin/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="block px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  >
                    System Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
              title="Logout from Super Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Left Sidebar (WordPress / Enterprise Admin Style) */}
        <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800">
          <div>
            {/* Sidebar Header Badge */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Network Administration
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                v2.4
              </span>
            </div>

            {/* Navigation Menu */}
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Info */}
          <div className="p-4 border-t border-slate-800 text-xs text-slate-500 space-y-2">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Cluster Health</span>
                <span className="text-emerald-400">99.98%</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Firestore Multi-Tenant Isolation Active
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>Sanatani Bandhan</span>
              <span>GCP Asia-SE1</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area (Light Gray Background) */}
        <main className="flex-1 bg-slate-50 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
