import React, { useRef, useState } from 'react';
import { Printer, ImagePlus, FileBadge } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { Card, Bn, Btn, Field, inputCls, Empty, Modal } from './ui';
import { todayISO, toBnDigits, uid, fmtDateEn } from './bn';
import { CertificateRecord } from './types';

/* Checklist #9 — সনদপত্র: proshongshapotro (testimonial), chharpotro
   (transfer), letterhead — photo/watermark, print-ready. */

type Kind = CertificateRecord['kind'];
const KINDS: Array<{ id: Kind; bn: string; en: string }> = [
  { id: 'proshongshapotro', bn: 'প্রশংসাপত্র', en: 'Testimonial' },
  { id: 'chharpotro', bn: 'ছাড়পত্র', en: 'Transfer certificate' },
  { id: 'letterhead', bn: 'লেটারহেড', en: 'Letterhead pad' },
];

const TEMPLATES: Record<Kind, (name: string, varga: string) => string> = {
  proshongshapotro: (n, v) => `এই মর্মে প্রত্যয়ন করা যাইতেছে যে, ${n}, ${v} বর্গের একজন নিয়মিত শিষ্য। পাঠশালায় অধ্যয়নকালে তাহার চরিত্র, আচরণ ও শৃঙ্খলা সন্তোষজনক ছিল। তাহার উজ্জ্বল ভবিষ্যৎ কামনা করি।`,
  chharpotro: (n, v) => `এই মর্মে ছাড়পত্র প্রদান করা হইল যে, ${n}, ${v} বর্গ হইতে বিদায় লইয়াছেন। পাঠশালার পাওনা সম্পূর্ণ পরিশোধিত। সর্বত্র তাহার মঙ্গল কামনা করি।`,
  letterhead: () => ``,
};

export const CertificateTab: React.FC = () => {
  const { state, add, remove } = usePathshala();
  const { gurukulStudents } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [kind, setKind] = useState<Kind>('proshongshapotro');
  const [studentId, setStudentId] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [preview, setPreview] = useState<CertificateRecord | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const orgName = activeWorkspace.name || 'পাঠশালা';
  const student = gurukulStudents.find((s) => s.id === studentId);
  const vargaName = state.vargas.find((v) => v.id === state.shishyaMeta.find((m) => m.studentId === studentId)?.vargaId)?.name || '';

  const fillTemplate = (k: Kind, sid: string) => {
    const s = gurukulStudents.find((x) => x.id === sid);
    const v = state.vargas.find((vv) => vv.id === state.shishyaMeta.find((m) => m.studentId === sid)?.vargaId)?.name || '';
    setBody(TEMPLATES[k](s?.studentName || '________', v || '________'));
  };

  const onPhoto = async (f: File) => {
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(f);
  };

  const issue = () => {
    if (kind !== 'letterhead' && !student) { alert('শিষ্য নির্বাচন করুন'); return; }
    const serial = `CERT-${new Date().getFullYear()}-${String(state.certificates.length + 1).padStart(4, '0')}`;
    const rec: CertificateRecord = { id: uid('cert'), kind, studentId: student?.id, date: todayISO(), serialNo: serial, body, photoDataUrl: photo, issuedBy: 'Acharya' };
    add('certificates', rec);
    setPreview(rec);
  };

  const kindBn = (k: Kind) => KINDS.find((x) => x.id === k)?.bn || k;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800"><Bn bn="সনদপত্র" en="Certificates" /></h2>
      </div>

      <Card>
        <div className="flex gap-2 mb-4 no-print flex-wrap">
          {KINDS.map((k) => (
            <button key={k.id} onClick={() => { setKind(k.id); fillTemplate(k.id, studentId); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold border min-h-[44px] ${kind === k.id ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200'}`}>
              {k.bn} <span className="block text-[10px] font-normal opacity-70">{k.en}</span>
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {kind !== 'letterhead' && (
            <Field label={<Bn bn="শিষ্য" en="Shishya" />}>
              <select value={studentId} onChange={(e) => { setStudentId(e.target.value); fillTemplate(kind, e.target.value); }} className={inputCls}>
                <option value="">— নির্বাচন —</option>
                {gurukulStudents.map((s) => <option key={s.id} value={s.id}>{s.studentName} ({s.rollNo})</option>)}
              </select>
            </Field>
          )}
          <Field label={<Bn bn="ছবি" en="Photo (optional)" />}>
            <div className="flex gap-2 items-center">
              <Btn variant="ghost" onClick={() => photoRef.current?.click()}><ImagePlus className="w-4 h-4" /> ছবি যোগ</Btn>
              {photo && <img src={photo} alt="shishya" className="w-12 h-14 object-cover rounded-lg border" />}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ''; }} />
            </div>
          </Field>
        </div>
        <Field label={<Bn bn="বিবরণ" en="Body text" />} className="mt-3">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={`${inputCls} !min-h-[120px]`} placeholder="এখানে লিখুন…" />
        </Field>
        <Btn onClick={issue} className="mt-3"><FileBadge className="w-4 h-4" /> সনদ তৈরি ও প্রিন্ট</Btn>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><Bn bn="ইস্যুকৃত সনদ" en="Issued certificates" /></h3>
        <div className="space-y-1.5">
          {[...state.certificates].reverse().map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-stone-100 py-2 text-sm">
              <div><span className="font-bold">{kindBn(c.kind)}</span> <span className="text-stone-500">• {c.serialNo} • {fmtDateEn(c.date)}</span>
                <div className="text-xs text-stone-500">{gurukulStudents.find((s) => s.id === c.studentId)?.studentName || '—'}</div></div>
              <div className="flex gap-1 no-print">
                <button onClick={() => setPreview(c)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" aria-label="Reprint"><Printer className="w-4 h-4" /></button>
                <button onClick={() => { if (window.confirm('মুছবেন?')) remove('certificates', c.id); }} className="p-2 rounded-lg bg-red-50 text-red-600" aria-label="Delete">✕</button>
              </div>
            </div>
          ))}
          {!state.certificates.length && <Empty text="এখনো কোনো সনদ ইস্যু হয়নি" />}
        </div>
      </Card>

      {preview && (
        <Modal title={<Bn bn="সনদ প্রিভিউ" en="Certificate preview" />} onClose={() => setPreview(null)} wide>
          <div className="print-area rounded-xl border-4 border-double border-amber-800 p-8 relative overflow-hidden" style={{ minHeight: 480 }}>
            {/* watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span className="text-[220px] text-amber-100 font-extrabold">ॐ</span>
            </div>
            <div className="relative">
              <h2 className="text-center font-extrabold text-2xl">{orgName}</h2>
              <p className="text-center text-sm mb-4">॥ {kindBn(preview.kind)} ॥</p>
              <div className="flex justify-between text-sm mb-4"><span>ক্রমিক: <b className="font-mono">{preview.serialNo}</b></span><span>তারিখ: {fmtDateEn(preview.date)}</span></div>
              {preview.photoDataUrl && <img src={preview.photoDataUrl} alt="" className="float-right w-24 h-28 object-cover border-2 border-amber-800 rounded ml-4 mb-2" />}
              <p className="text-base leading-relaxed whitespace-pre-wrap">{preview.body}</p>
              <div className="flex justify-between mt-16 text-sm">
                <div><div className="border-t border-black pt-1 px-6">তারিখ</div></div>
                <div className="text-center"><div className="border-t border-black pt-1 px-6">আচার্যের স্বাক্ষর</div><div className="text-xs text-stone-500">(সিলমোহর)</div></div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 no-print">
            <Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> প্রিন্ট</Btn>
            <Btn variant="ghost" onClick={() => setPreview(null)}>বন্ধ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
