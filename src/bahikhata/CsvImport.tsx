import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, AlertTriangle } from 'lucide-react';
import type { BahiTarget, ImportBatch } from './types';
import { TARGET_FIELDS } from './types';
import { bk, fieldLabel, type BkLang } from './copy';
import { applyMapping, autoMapHeaders, buildMappedFromFields, coerceEnumWords } from './mapping';
import { analyzeRows, type ExistingNandiLike, type ExistingPerson } from './dedupe';
import { createBatch } from './bahikhataStore';
import { parseCSVText, exportToCSV } from '../utils/csvEngine';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* CSV import — file → column mapping → DRAFT batch. Never a direct    */
/* commit: the file's rows land in the same review flow as typed       */
/* rows (the Bahi-Khata iron law). XLSX is guided, not parsed: the     */
/* in-app "Save As CSV" instructions carry BN/HI/EN copy and the       */
/* original Excel file is never touched.                               */
/* ------------------------------------------------------------------ */

interface Props {
  target: BahiTarget;
  lang: BkLang;
  workspaceId: string;
  enteredBy: ImportBatch['enteredBy'];
  existingMembers: ExistingPerson[];
  existingHerd: ExistingNandiLike[];
  rememberedMap?: Record<string, string>;
  onRememberMap: (target: BahiTarget, map: Record<string, string>) => void;
  onCreated: (b: ImportBatch) => void;
  onBack: () => void;
}

export const CsvImport: React.FC<Props> = ({
  target, lang, workspaceId, enteredBy, existingMembers, existingHerd,
  rememberedMap, onRememberMap, onCreated, onBack,
}) => {
  const { showToast } = useToast();
  const fields = TARGET_FIELDS[target];
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [fieldToHeader, setFieldToHeader] = useState<Record<string, string>>({});
  const [isXlsx, setIsXlsx] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      setIsXlsx(true);
      setHeaders([]);
      setRecords([]);
      return;
    }
    setIsXlsx(false);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || '');
      const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) || '';
      const hdrs = firstLine.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
      const recs = parseCSVText(text);
      if (!hdrs.length || !recs.length) {
        showToast(bk(lang, 'csvNoRows'), 'warning');
        return;
      }
      setHeaders(hdrs);
      setRecords(recs);
      setFieldToHeader(autoMapHeaders(target, hdrs, rememberedMap));
    };
    reader.readAsText(file);
  };

  const previewRows = useMemo(() => {
    if (!records.length) return [];
    const mappedFields = applyMapping(records.slice(0, 3), fieldToHeader);
    return mappedFields.map((f) => buildMappedFromFields(target, f));
  }, [records, fieldToHeader, target]);

  const handleCreate = () => {
    const mappedFields = applyMapping(records, fieldToHeader);
    const items = records.map((rec, i) => ({
      raw: rec,
      mapped: coerceEnumWords(target, buildMappedFromFields(target, mappedFields[i] || {})),
      pageNo: 1,
    }));
    const rows = analyzeRows(target, items, { existingMembers, existingHerd }, `csv_${Date.now().toString(36)}`);
    const batch = createBatch({
      workspaceId,
      target,
      source: 'csv',
      label: fileName ? `CSV — ${fileName}` : 'CSV import',
      enteredBy,
    });
    batch.rows = rows;
    onRememberMap(target, fieldToHeader);
    showToast(bk(lang, 'csvBatchCreated'), 'success');
    onCreated(batch);
  };

  const downloadTemplate = () => {
    const hdrs = fields.map((f) => f.key);
    exportToCSV(`bahikhata-${target}-template.csv`, hdrs, [hdrs.map(() => '')]);
  };

  const selectCls =
    'w-full min-h-[48px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-amber-800 min-h-[44px]">
        {bk(lang, 'backBtn')}
      </button>
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-black text-lg text-stone-900">{bk(lang, 'csvTitle')}</h3>
        <label className="flex items-center justify-center gap-2 min-h-[56px] px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black cursor-pointer shadow">
          <FileSpreadsheet className="w-5 h-5" />
          <span>{bk(lang, 'csvPick')}</span>
          <input type="file" accept=".csv,.xlsx,.xls,text/csv" className="hidden" onChange={handleFile} />
        </label>
        <button type="button" onClick={downloadTemplate} className="text-sm font-bold text-amber-800 min-h-[44px]">
          {bk(lang, 'csvTemplate')}
        </button>
        {isXlsx && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">{bk(lang, 'csvXlsxNote')}</p>
          </div>
        )}
      </div>

      {headers.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="font-black text-stone-900">{bk(lang, 'csvMapTitle')}</h4>
            <p className="text-xs text-stone-500 mt-0.5">{bk(lang, 'csvMapIntro')}</p>
            <p className="text-xs text-stone-500 mt-1 font-mono">{fileName} · {records.length} rows</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {fields.map((def) => (
              <label key={def.key} className="block">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                  {fieldLabel(lang, def.key)}{def.required ? ' *' : ''}
                </span>
                <select
                  className={selectCls}
                  value={fieldToHeader[def.key] || ''}
                  onChange={(e) => setFieldToHeader((m) => ({ ...m, [def.key]: e.target.value }))}
                >
                  <option value="">{bk(lang, 'csvIgnore')}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {previewRows.length > 0 && (
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 overflow-x-auto">
              <table className="text-xs w-full">
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-b border-stone-200 last:border-0">
                      {fields.slice(0, 4).map((def) => (
                        <td key={def.key} className="py-1.5 pr-3 text-stone-700">
                          {String(r[def.key] ?? '') || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            type="button"
            onClick={handleCreate}
            className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow"
          >
            {bk(lang, 'csvCreateBatch')}
          </button>
        </div>
      )}
    </div>
  );
};
