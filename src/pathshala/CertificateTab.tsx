import React, { useRef, useState } from 'react';
import { Printer, ImagePlus, FileBadge } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Btn, Field, inputCls, Empty, Modal, useLocaleText } from './ui';
import { todayISO, uid, fmtDateEn } from './bn';
import { CertificateRecord } from './types';

/* Checklist #9 — certificates: proshongshapotro (testimonial), chharpotro
   (transfer), letterhead — photo/watermark, print-ready. */

type Kind = CertificateRecord['kind'];
const KIND_IDS: Kind[] = ['proshongshapotro', 'chharpotro', 'letterhead'];
const KIND_KEY_SUFFIX: Record<Kind, string> = {
  proshongshapotro: 'Proshongshapotro',
  chharpotro: 'Chharpotro',
  letterhead: 'Letterhead',
};
/* English kind names — small gloss shown under the label in non-English locales. */
const KIND_EN: Record<Kind, string> = {
  proshongshapotro: 'Testimonial',
  chharpotro: 'Transfer certificate',
  letterhead: 'Letterhead pad',
};

export const CertificateTab: React.FC = () => {
  const { t } = useLanguage();
  const { lang } = useLocaleText();
  const { state, add, remove } = usePathshala();
  const { gurukulStudents } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [kind, setKind] = useState<Kind>('proshongshapotro');
  const [studentId, setStudentId] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [preview, setPreview] = useState<CertificateRecord | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const orgName = activeWorkspace.name || t('suites.pathshala.certificate.orgFallback');
  const student = gurukulStudents.find((s) => s.id === studentId);

  /* Certificate body templates — one localized template per kind with
     {name} / {varga} placeholders filled in below. */
  const templateFor = (k: Kind, name: string, varga: string): string => {
    if (k === 'letterhead') return '';
    const tpl = t(`suites.pathshala.certificate.tpl${KIND_KEY_SUFFIX[k]}`);
    return tpl.replace('{name}', name).replace('{varga}', varga);
  };

  const fillTemplate = (k: Kind, sid: string) => {
    const s = gurukulStudents.find((x) => x.id === sid);
    const v = state.vargas.find((vv) => vv.id === state.shishyaMeta.find((m) => m.studentId === sid)?.vargaId)?.name || '';
    setBody(templateFor(k, s?.studentName || '________', v || '________'));
  };

  const onPhoto = async (f: File) => {
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(f);
  };

  const issue = () => {
    if (kind !== 'letterhead' && !student) { alert(t('suites.pathshala.certificate.selectShishya')); return; }
    const serial = `CERT-${new Date().getFullYear()}-${String(state.certificates.length + 1).padStart(4, '0')}`;
    const rec: CertificateRecord = { id: uid('cert'), kind, studentId: student?.id, date: todayISO(), serialNo: serial, body, photoDataUrl: photo, issuedBy: 'Acharya' };
    add('certificates', rec);
    setPreview(rec);
  };

  const kindLabel = (k: Kind): string => t(`suites.pathshala.certificate.kind${KIND_KEY_SUFFIX[k]}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.pathshala.certificate.heading')}</h2>
      </div>

      <Card>
        <div className="flex gap-2 mb-4 no-print flex-wrap">
          {KIND_IDS.map((kid) => (
            <button key={kid} onClick={() => { setKind(kid); fillTemplate(kid, studentId); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold border min-h-[44px] ${kind === kid ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200'}`}>
              {kindLabel(kid)}
              {lang !== 'en' && <span className="block text-[10px] font-normal opacity-70">{KIND_EN[kid]}</span>}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {kind !== 'letterhead' && (
            <Field label={t('suites.pathshala.certificate.fShishya')}>
              <select value={studentId} onChange={(e) => { setStudentId(e.target.value); fillTemplate(kind, e.target.value); }} className={inputCls}>
                <option value="">{t('suites.pathshala.certificate.selectDash')}</option>
                {gurukulStudents.map((s) => <option key={s.id} value={s.id}>{s.studentName} ({s.rollNo})</option>)}
              </select>
            </Field>
          )}
          <Field label={t('suites.pathshala.certificate.fPhoto')}>
            <div className="flex gap-2 items-center">
              <Btn variant="ghost" onClick={() => photoRef.current?.click()}><ImagePlus className="w-4 h-4" /> {t('suites.pathshala.certificate.addPhoto')}</Btn>
              {photo && <img src={photo} alt="shishya" className="w-12 h-14 object-cover rounded-lg border" />}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ''; }} />
            </div>
          </Field>
        </div>
        <Field label={t('suites.pathshala.certificate.fBody')} className="mt-3">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={`${inputCls} !min-h-[120px]`} placeholder={t('suites.pathshala.certificate.phBody')} />
        </Field>
        <Btn onClick={issue} className="mt-3"><FileBadge className="w-4 h-4" /> {t('suites.pathshala.certificate.issuePrint')}</Btn>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.certificate.issuedTitle')}</h3>
        <div className="space-y-1.5">
          {[...state.certificates].reverse().map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-stone-100 py-2 text-sm">
              <div><span className="font-bold">{kindLabel(c.kind)}</span> <span className="text-stone-500">• {c.serialNo} • {fmtDateEn(c.date)}</span>
                <div className="text-xs text-stone-500">{gurukulStudents.find((s) => s.id === c.studentId)?.studentName || '—'}</div></div>
              <div className="flex gap-1 no-print">
                <button onClick={() => setPreview(c)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" aria-label={t('suites.pathshala.certificate.reprintTip')}><Printer className="w-4 h-4" /></button>
                <button onClick={() => { if (window.confirm(t('suites.pathshala.certificate.confirmDelete'))) remove('certificates', c.id); }} className="p-2 rounded-lg bg-red-50 text-red-600" aria-label={t('suites.pathshala.certificate.deleteTip')}>✕</button>
              </div>
            </div>
          ))}
          {!state.certificates.length && <Empty text={t('suites.pathshala.certificate.noCerts')} />}
        </div>
      </Card>

      {preview && (
        <Modal title={t('suites.pathshala.certificate.previewTitle')} onClose={() => setPreview(null)} wide>
          <div className="print-area rounded-xl border-4 border-double border-amber-800 p-8 relative overflow-hidden" style={{ minHeight: 480 }}>
            {/* watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span className="text-[220px] text-amber-100 font-extrabold">ॐ</span>
            </div>
            <div className="relative">
              <h2 className="text-center font-extrabold text-2xl">{orgName}</h2>
              <p className="text-center text-sm mb-4">॥ {kindLabel(preview.kind)} ॥</p>
              <div className="flex justify-between text-sm mb-4"><span>{t('suites.pathshala.certificate.colSerial')}: <b className="font-mono">{preview.serialNo}</b></span><span>{t('suites.pathshala.certificate.colDate')}: {fmtDateEn(preview.date)}</span></div>
              {preview.photoDataUrl && <img src={preview.photoDataUrl} alt="" className="float-right w-24 h-28 object-cover border-2 border-amber-800 rounded ml-4 mb-2" />}
              <p className="text-base leading-relaxed whitespace-pre-wrap">{preview.body}</p>
              <div className="flex justify-between mt-16 text-sm">
                <div><div className="border-t border-black pt-1 px-6">{t('suites.pathshala.certificate.colDate')}</div></div>
                <div className="text-center"><div className="border-t border-black pt-1 px-6">{t('suites.pathshala.certificate.acharyaSign')}</div><div className="text-xs text-stone-500">({t('suites.pathshala.certificate.seal')})</div></div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 no-print">
            <Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> {t('suites.pathshala.certificate.print')}</Btn>
            <Btn variant="ghost" onClick={() => setPreview(null)}>{t('suites.pathshala.certificate.close')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
