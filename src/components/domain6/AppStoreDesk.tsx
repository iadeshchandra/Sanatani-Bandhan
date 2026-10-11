import React, { useState } from 'react';
import { Layers as Blocks, CheckCircle2, Download, Trash2, Search, ShieldAlert, Sparkles, Filter, Settings, Layers } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { MODULE_CATALOG } from '../common/Sidebar';
import { workspaceRegistry } from '../../lib/workspaceRegistry';
import { useToast } from '../../context/ToastContext';

export const AppStoreDesk: React.FC = () => {
  const { activeWorkspace, updateWorkspaceDetails } = useAuthWorkspace();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Native' | 'Installed' | 'Available'>('All');

  if (!activeWorkspace) return null;

  const baseModules = workspaceRegistry[activeWorkspace.type] || [];
  const enabledModules = activeWorkspace.enabledModules || [];

  const handleToggleModule = (moduleId: string, isInstalling: boolean) => {
    let newEnabled = [...enabledModules];
    
    if (isInstalling) {
      if (!newEnabled.includes(moduleId)) {
        newEnabled.push(moduleId);
      }
      showToast("Module installed successfully.", "success");
    } else {
      newEnabled = newEnabled.filter(id => id !== moduleId);
      showToast("Module uninstalled.", "success");
    }

    updateWorkspaceDetails({ enabledModules: newEnabled });
  };

  const processedModules = MODULE_CATALOG.filter(m => 
    !['dashboard', 'appStore', 'sadhana-karma', 'sanatani-vivah', 'yatraNet'].includes(m.id)
  ).map(m => {
    const isNative = baseModules.includes(m.id);
    const isInstalled = enabledModules.includes(m.id);
    
    let status: 'Native' | 'Installed' | 'Available' = 'Available';
    if (isNative) status = 'Native';
    else if (isInstalled) status = 'Installed';

    return { ...m, status };
  });

  const filteredModules = processedModules.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.domainTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    return m.status === activeFilter;
  });

  // Group by Domain
  const groupedModules = filteredModules.reduce((acc, module) => {
    if (!acc[module.domainTitle]) {
      acc[module.domainTitle] = [];
    }
    acc[module.domainTitle].push(module);
    return acc;
  }, {} as Record<string, typeof processedModules>);

  return (
    <div className="flex flex-col h-full bg-temple-950 text-temple-200">
      {/* Header */}
      <div className="shrink-0 border-b border-temple-800 bg-temple-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles size={12} /> Enterprise Integrations
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Blocks className="w-8 h-8 text-indigo-500" />
                App Store & Add-ons
              </h1>
              <p className="text-sm text-temple-400 mt-2 font-medium max-w-2xl leading-relaxed">
                Customize your workspace beyond its base archetype. Install specialized modules like the Crisis Command Center, Raktha Seva, or Asset Tracking to solve real-world organizational pain points.
              </p>
            </div>
            
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex gap-2">
                {['All', 'Native', 'Installed', 'Available'].map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f as any)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                      activeFilter === f 
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                        : 'bg-temple-900 text-temple-400 border-temple-800 hover:text-temple-200 hover:bg-temple-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-temple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-temple-900 border border-temple-800 rounded-lg text-sm text-temple-200 placeholder-temple-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {Object.keys(groupedModules).length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-temple-900 rounded-full flex items-center justify-center mb-4 border border-temple-800">
              <Layers className="w-8 h-8 text-temple-600" />
            </div>
            <h3 className="text-xl font-black text-temple-300">No Modules Found</h3>
            <p className="text-temple-500 text-sm mt-2 max-w-sm">
              Adjust your search filters or browse the complete catalog.
            </p>
          </div>
        ) : (
          <div className="space-y-12 pb-12">
            {Object.entries(groupedModules).map(([domain, mods]) => (
              <div key={domain}>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-lg font-black text-white">{domain}</h2>
                  <div className="h-px bg-temple-800 flex-1"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mods.map(mod => {
                    const Icon = mod.icon;
                    return (
                      <div key={mod.id} className="bg-temple-900 border border-temple-800 rounded-2xl p-5 hover:border-temple-700 transition-all flex flex-col group relative overflow-hidden shadow-sm hover:shadow-xl">
                        
                        {/* Native Badge Overlay */}
                        {mod.status === 'Native' && (
                          <div className="absolute top-0 right-0">
                             <div className="bg-temple-800 text-[9px] font-black uppercase tracking-widest text-temple-400 px-3 py-1 rounded-bl-xl border-l border-b border-temple-700/50 flex items-center gap-1">
                               <Settings size={10} /> Base Archetype
                             </div>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-4 mb-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                            mod.status === 'Native' ? 'bg-temple-800 border-temple-700 text-temple-400' :
                            mod.status === 'Installed' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' :
                            'bg-temple-950 border-temple-800 text-temple-500'
                          }`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="pr-4">
                            <h3 className="font-bold text-temple-100 leading-tight mb-1">{mod.name}</h3>
                            {mod.badge && (
                              <span className="inline-block px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                {mod.badge}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description Mapper (Hardcoded context for life savers to explain the pain they solve) */}
                        <p className="text-xs text-temple-400 leading-relaxed mb-6 mt-1 flex-1">
                          {mod.id === 'rakthaSeva' && "A vital medical registry connecting donors to critical patients during emergencies."}
                          {mod.id === 'crisis-command' && "Centralized emergency broadcast and handling for lost children, fires, and medical crises."}
                          {mod.id === 'sevadarRoster' && "Solve volunteer scheduling chaos with structured shifts and check-ins."}
                          {mod.id === 'taxReceipts' && "Automate 80G/12A tax certificate generation, saving hundreds of hours in admin overhead."}
                          {mod.id === 'inventory' && "Prevent theft and track wear-and-tear of valuable organization assets."}
                          {!['rakthaSeva', 'crisis-command', 'sevadarRoster', 'taxReceipts', 'inventory'].includes(mod.id) && 
                            `Integrate the ${mod.name} module into your workspace to enhance your operational capabilities.`}
                        </p>

                        <div className="pt-4 border-t border-temple-800/50 mt-auto">
                          {mod.status === 'Native' ? (
                            <button disabled className="w-full py-2.5 rounded-xl bg-temple-950 border border-temple-800 text-temple-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 opacity-70 cursor-not-allowed">
                              <CheckCircle2 size={16} /> Included in {activeWorkspace.type}
                            </button>
                          ) : mod.status === 'Installed' ? (
                            <button 
                              onClick={() => handleToggleModule(mod.id, false)}
                              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                              <Trash2 size={16} /> Uninstall Add-on
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleToggleModule(mod.id, true)}
                              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-md text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                              <Download size={16} /> Install Module
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
