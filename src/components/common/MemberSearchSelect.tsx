import React, { useState, useRef, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface MemberSearchSelectProps {
  value: string;
  onChange: (name: string, id: string) => void;
  placeholder?: string;
  className?: string;
  allowFreeText?: boolean;
  name?: string;
}

export const MemberSearchSelect: React.FC<MemberSearchSelectProps> = ({
  name,
  value,
  onChange,
  placeholder = "Search member...",
  className = "",
  allowFreeText = true
}) => {
  const { devotees } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (allowFreeText && searchTerm !== value) {
          onChange(searchTerm, ''); // Update to whatever was typed
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef, searchTerm, value, onChange, allowFreeText]);

  const safeSearchTerm = searchTerm || '';
  const filteredDevotees = devotees.filter(d => {
    const nameMatch = (d.fullName || '').toLowerCase().includes(safeSearchTerm.toLowerCase());
    const phoneMatch = (d.phone || '').includes(safeSearchTerm);
    const gotraMatch = (d.gotra || '').toLowerCase().includes(safeSearchTerm.toLowerCase());
    return nameMatch || phoneMatch || gotraMatch;
  });

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {name && <input type="hidden" name={name} value={searchTerm} />}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (allowFreeText) {
              onChange(e.target.value, '');
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-saffron-500"
        />
        <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-temple-400" />
      </div>
      
      {isOpen && (searchTerm || devotees.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-temple-900 border border-temple-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {filteredDevotees.length > 0 ? (
            <div className="p-1">
              {filteredDevotees.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSearchTerm(d.fullName);
                    onChange(d.fullName, d.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-temple-800 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-saffron-500/20 text-saffron-500 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-temple-200">{d.fullName}</p>
                    <p className="text-[10px] text-temple-400">{d.phone} {d.gotra ? `• ${d.gotra}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-xs text-temple-500 text-center">
              {allowFreeText ? 'Will be saved as new name' : 'No members found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
