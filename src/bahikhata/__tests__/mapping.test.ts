import { applyMapping, autoMapHeaders, buildMappedFromFields, coerceEnumWords } from '../mapping';

describe('autoMapHeaders — office files map themselves', () => {
  it('maps transliterated + English headers for members', () => {
    const map = autoMapHeaders('members', ['FullName', 'Mobile No', 'Gotra', 'Village']);
    expect(map.fullName).toBe('FullName');
    expect(map.phone).toBe('Mobile No');
    expect(map.gotra).toBe('Gotra');
    expect(map.address).toBe('Village');
  });
  it('maps Bengali-script headers', () => {
    const map = autoMapHeaders('members', ['নাম', 'ফোন', 'গোত্র']);
    expect(map.fullName).toBe('নাম');
    expect(map.phone).toBe('ফোন');
    expect(map.gotra).toBe('গোত্র');
  });
  it('maps herd headers incl. Tag and Jaat', () => {
    const map = autoMapHeaders('herd', ['Name', 'Tag No', 'Jaat', 'Age', 'Sex']);
    expect(map.tagId).toBe('Tag No');
    expect(map.breed).toBe('Jaat');
    expect(map.ageYears).toBe('Age');
  });
  it('a remembered mapping wins over guessing', () => {
    const map = autoMapHeaders('members', ['নাম', 'Mobile', 'Fon'], { phone: 'Fon' });
    expect(map.phone).toBe('Fon');
  });
  it('never assigns one header to two fields', () => {
    const map = autoMapHeaders('donors', ['Name', 'Amount']);
    const headersUsed = Object.values(map);
    expect(new Set(headersUsed).size).toBe(headersUsed.length);
  });
});

describe('applyMapping + buildMappedFromFields — one clean funnel', () => {
  it('applies the mapping and coerces a Bengali-digit phone to clean digits', () => {
    const recs = applyMapping([{ 'নাম': 'Haripada', 'ফোন': '০১৭১২-৩৪৫৬৭৮' }], { fullName: 'নাম', phone: 'ফোন' });
    const mapped = buildMappedFromFields('members', recs[0]);
    expect(mapped.fullName).toBe('Haripada');
    expect(mapped.phone).toBe('01712345678');
  });
  it('coerces donor amounts and dates typed in Bengali digits', () => {
    const mapped = buildMappedFromFields('donors', {
      fullName: 'X', lifetimeDonated: '৫,১০০', donationAmount: '৫০১', donationDate: '১৫/০১/২০২৬',
    });
    expect(mapped.lifetimeDonated).toBe(5100);
    expect(mapped.donationAmount).toBe(501);
    expect(mapped.donationDate).toBe('2026-01-15');
  });
  it('coerces paper sex/source words to enums on the herd CSV path', () => {
    const mapped = coerceEnumWords('herd', { sex: 'গাই', source: 'উদ্ধার' });
    expect(mapped.sex).toBe('cow');
    expect(mapped.source).toBe('rescued');
  });
});
