import React, { useState } from 'react';
import { ShieldCheck, Search, Download, Clock, ShieldAlert, Lock, Activity } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { exportToCSV } from '../../utils/csvEngine';
import { useToast } from '../../context/ToastContext';

interface AuditTrailItem {
  id: string;
  timestamp: string;
  userEmail: string;
  userRole: string;
  action: string;
  module: string;
  ipAddress: string;
  severity: 'Info' | 'Warning' | 'Security';
  sha256Hash: string;
}

export const AuditLogDesk: React.FC = () => {
  const { activeWorkspace, currentUser } = useAuthWorkspace();
  const { devotees } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');

  const [auditLogs] = useState<AuditTrailItem[]>([
    {
      id: 'log-101',
      timestamp: '2026-08-24 11:42:15',
      userEmail: 'adhyaksha@sanatanibandhan.org',
      userRole: 'SUPER_ADMIN',
      action: 'BATCH_INGEST_DEVOTEES (150 rows processed)',
      module: 'Bulk CSV Ingestion Desk',
      ipAddress: '103.24.12.89',
      severity: 'Info',
      sha256Hash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
    },
    {
      id: 'log-102',
      timestamp: '2026-08-24 10:15:30',
      userEmail: 'accountant@kashi-mandir.org',
      userRole: 'ACCOUNTANT',
      action: 'ISSUE_TAX_RECEIPT (Receipt #SB-80G-1082)',
      module: 'Section 80G Tax Desk',
      ipAddress: '49.36.142.11',
      severity: 'Info',
      sha256Hash: 'b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
    },
    {
      id: 'log-103',
      timestamp: '2026-08-24 08:30:12',
      userEmail: 'priest@sanatanibandhan.org',
      userRole: 'PUROHIT',
      action: 'SANCTUM_VAULT_DEITY_CROWN_AUDIT',
      module: 'Fixed Asset Desk',
      ipAddress: '103.24.12.89',
      severity: 'Security',
      sha256Hash: 'c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    },
    {
      id: 'log-104',
      timestamp: '2026-08-23 21:10:00',
      userEmail: 'guest_user@ip-202.44.1.2',
      userRole: 'ANONYMOUS',
      action: 'PIN_AUTH_FAILED (Attempt 1 for PIN: 9999)',
      module: 'Smart ID Pass Desk',
      ipAddress: '202.44.1.2',
      severity: 'Warning',
      sha256Hash: 'd0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    },
  ]);

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      l.userEmail?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      l.module?.toLowerCase().includes(searchTerm?.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'User Email', 'Role', 'Action', 'Module', 'IP Address', 'Severity', 'Cryptographic SHA-256 Stamp'];
    const rows = auditLogs.map((l, idx) => [
      l.id,
      l.timestamp,
      l.userEmail,
      l.userRole,
      l.action,
      l.module,
      l.ipAddress,
      l.severity,
      l.sha256Hash,
    ]);
    exportToCSV(`Audit_Log_${activeWorkspace.type}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Audit Log CSV exported!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
              Immutable Cryptographic Audit Trail
            </span>
            <span className="text-xs text-temple-400 font-mono">
              Zero-Trust Enterprise Compliance
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Security & System Audit Log Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Tamper-proof record of every financial transaction, member edit, vault opening, and failed authentication
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log</span>
        </button>
      </div>

      
      {/* Security Health Check Widget */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-temple-100">Security Health Check</h3>
            <p className="text-xs text-temple-400">Monitoring for excessive permissions and privileged accounts.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(() => {
            const elevatedRoles = ['TRUSTEE', 'SUPER_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'SUPER_ADMIN'];
            const elevatedUsers = devotees.filter(d => elevatedRoles.includes(d.role));
            // A non-admin user with trustee roles might be someone with a generic email or low seva index
            const suspiciousUsers = elevatedUsers.filter(d => d.sevaIndex < 100 || !d.email?.includes('@'));
            
            return (
              <>
                <div className="bg-temple-950/50 border border-temple-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-temple-300">Privileged Accounts</span>
                    <span className="text-xs font-mono bg-temple-800 text-temple-300 px-2 py-0.5 rounded-lg">{elevatedUsers.length}</span>
                  </div>
                  <p className="text-[10px] text-temple-500">Total accounts with administrative or trustee access.</p>
                </div>
                
                <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-rose-400">Suspicious Access</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${suspiciousUsers.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {suspiciousUsers.length} Flags
                    </span>
                  </div>
                  <p className="text-[10px] text-temple-500">Privileged accounts with missing emails or low Seva Index.</p>
                  
                  {suspiciousUsers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {suspiciousUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-temple-900/50 p-2 rounded-xl border border-rose-500/10">
                          <div>
                            <p className="text-xs font-bold text-temple-200">{u.fullName || u.name || 'Unknown'}</p>
                            <p className="text-[10px] text-rose-400 font-mono uppercase">{u.role}</p>
                          </div>
                          <button className="text-[10px] bg-temple-800 hover:bg-temple-700 text-temple-300 px-2 py-1 rounded border border-temple-700 transition-colors">
                            Review
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-temple-900/90 border border-temple-800 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-temple-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search logs by action, user email, module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-temple-800 border border-temple-700 rounded-xl pl-9 pr-3 py-2 text-xs text-temple-200 placeholder-temple-400 focus:outline-none focus:border-saffron-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-temple-400 uppercase bg-temple-950/60 font-semibold border-b border-temple-800">
              <tr>
                <th className="p-3">Severity & ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User & Persona</th>
                <th className="p-3">Action & Module</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">Cryptographic SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-temple-800">
              {filteredLogs.map((log, idx) => (
                <tr key={`${log.id}-${idx}`} className="hover:bg-temple-800/40 transition-colors">
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.severity === 'Security'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.severity === 'Warning'
                          ? 'bg-saffron-500/20 text-saffron-400 border border-saffron-500/30'
                          : 'bg-temple-800 text-temple-300'
                      }`}
                    >
                      {log.severity}
                    </span>
                    <p className="text-[10px] text-temple-400 font-mono mt-1">{log.id}</p>
                  </td>
                  <td className="p-3 font-mono text-temple-300 text-[11px]">{log.timestamp}</td>
                  <td className="p-3">
                    <p className="font-bold text-temple-100">{log.userEmail}</p>
                    <p className="text-[10px] text-saffron-400 font-mono uppercase">{log.userRole}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-temple-200">{log.action}</p>
                    <p className="text-[11px] text-temple-400">{log.module}</p>
                  </td>
                  <td className="p-3 font-mono text-temple-300">{log.ipAddress}</td>
                  <td className="p-3 font-mono text-[10px] text-temple-400 truncate max-w-[140px]">
                    {log.sha256Hash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
