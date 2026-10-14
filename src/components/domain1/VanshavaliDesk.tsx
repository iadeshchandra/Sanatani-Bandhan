import React, { useState } from 'react';
import { GitFork, Plus, User, Sparkles, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { VanshavaliNode } from '../../types';
import { useToast } from '../../context/ToastContext';

interface TreeNodeProps {
  node: VanshavaliNode;
  onAddChild: (parentNode: VanshavaliNode) => void;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({ node, onAddChild }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Box */}
      <div className="bg-temple-900 border-2 border-saffron-500/40 hover:border-saffron-400 rounded-2xl p-4 shadow-xl text-temple-100 min-w-[240px] max-w-[280px] transition-all relative group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-saffron-500/20 border border-saffron-500/30 flex items-center justify-center text-saffron-400 font-bold text-xs">
              G{node.generation}
            </div>
            <div>
              <p className="font-extrabold text-xs text-saffron-100 leading-tight">{node.name}</p>
              <p className="text-[10px] text-saffron-400 font-medium">{node.relation}</p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded bg-temple-800 text-[9px] font-mono text-temple-300">
            {node.gotra}
          </span>
        </div>

        {node.spouse && (
          <p className="text-[11px] text-temple-300 mt-2">
            <span className="text-temple-400">Dharmapatni:</span> {node.spouse}
          </p>
        )}

        {(node.birthYear || node.deathYear) && (
          <p className="text-[10px] text-temple-400 font-mono mt-0.5">
            {node.birthYear ? `b. ${node.birthYear}` : ''} {node.deathYear ? `- d. ${node.deathYear}` : '(Present)'}
          </p>
        )}

        {node.notes && (
          <p className="text-[10px] text-saffron-200/80 italic mt-1.5 pt-1.5 border-t border-temple-800">
            "{node.notes}"
          </p>
        )}

        {/* Quick Action Button */}
        <div className="mt-3 pt-2 border-t border-temple-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onAddChild(node)}
            className="text-[10px] px-2 py-1 rounded-lg bg-temple-800 hover:bg-saffron-500 hover:text-temple-950 text-saffron-300 font-semibold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Descendant</span>
          </button>

          {hasChildren && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] text-temple-400 hover:text-temple-200 flex items-center gap-0.5"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>{node.children!.length} branch</span>
            </button>
          )}
        </div>
      </div>

      {/* Children Tree Branch */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center">
          {/* Vertical Connector */}
          <div className="w-0.5 h-6 bg-saffron-500/50" />

          {/* Horizontal Connector Container */}
          <div className="flex gap-6 relative pt-4">
            {node.children!.length > 1 && (
              <div className="absolute top-0 left-12 right-12 h-0.5 bg-saffron-500/50" />
            )}

            {node.children!.map((child, idx) => (
              <div key={`${child.id}-${idx}`} className="flex flex-col items-center relative">
                {/* Branch Top Pin */}
                <div className="w-0.5 h-4 bg-saffron-500/50 absolute -top-4" />
                <TreeNodeComponent node={child} onAddChild={onAddChild} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const VanshavaliDesk: React.FC = () => {
  const { vanshavali, updateVanshavali } = useData();
  const { showToast } = useToast();

  const [selectedParent, setSelectedParent] = useState<VanshavaliNode | null>(null);
  const [childName, setChildName] = useState('');
  const [childRelation, setChildRelation] = useState('Putra (Son)');
  const [childGotra, setChildGotra] = useState('Shandilya');
  const [birthYear, setBirthYear] = useState('');
  const [spouse, setSpouse] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = (parent: VanshavaliNode) => {
    setSelectedParent(parent);
    setChildGotra(parent.gotra);
  };

  const handleSaveChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent || !childName.trim()) return;

    const newChild: VanshavaliNode = {
      id: `node-${Date.now()}`,
      name: childName.trim(),
      generation: selectedParent.generation + 1,
      gotra: childGotra.trim() || selectedParent.gotra,
      relation: childRelation,
      birthYear: birthYear.trim() || undefined,
      spouse: spouse.trim() || undefined,
      notes: notes.trim() || undefined,
      children: [],
    };

    // Recursive insertion
    const insertChild = (current: VanshavaliNode): VanshavaliNode => {
      if (current.id === selectedParent.id) {
        return {
          ...current,
          children: [...(current.children || []), newChild],
        };
      }
      if (current.children) {
        return {
          ...current,
          children: current.children.map(insertChild),
        };
      }
      return current;
    };

    const updatedTree = insertChild(vanshavali);
    updateVanshavali(updatedTree);
    setSelectedParent(null);
    setChildName('');
    setNotes('');
    setSpouse('');
    setBirthYear('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Vedic Vanshavali Engine
            </span>
            <span className="text-xs text-temple-400 font-mono">
              Preserving 7 Generations of Gotra Lineage
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Ancestral Lineage Tree (Vanshavali)
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Interactive genealogical chart recording Gotra, Pravara, Prapitamaha, and descendants
          </p>
        </div>
      </div>

      {/* Interactive Lineage Tree Canvas */}
      <div className="bg-temple-950/80 border border-temple-800 rounded-3xl p-8 shadow-2xl overflow-x-auto custom-scrollbar flex justify-center min-h-[500px]">
        <TreeNodeComponent node={vanshavali} onAddChild={handleOpenAdd} />
      </div>

      {/* Add Descendant Modal */}
      {selectedParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl w-full max-w-md shadow-2xl p-6 text-temple-100">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">
                Add Descendant under {selectedParent.name} (Gen {selectedParent.generation})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedParent(null)}
                className="text-temple-400 hover:text-temple-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChild} className="space-y-3 text-xs">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Descendant Name *</label>
                <input
                  type="text"
                  required
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Sri Raghav Shastri"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Relation</label>
                  <select
                    value={childRelation}
                    onChange={(e) => setChildRelation(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  >
                    <option>Putra (Son)</option>
                    <option>Putri (Daughter)</option>
                    <option>Pautra (Grandson)</option>
                    <option>Pautri (Granddaughter)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Gotra</label>
                  <input
                    type="text"
                    value={childGotra}
                    onChange={(e) => setChildGotra(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Birth Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2005"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Spouse (Optional)</label>
                  <input
                    type="text"
                    value={spouse}
                    onChange={(e) => setSpouse(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Shastric Notes / Achievements</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Studying Rigveda at Sandipani Gurukul"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-temple-800">
                <button
                  type="button"
                  onClick={() => setSelectedParent(null)}
                  className="px-4 py-2 rounded-xl bg-temple-800 text-temple-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold"
                >
                  Add to Tree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
