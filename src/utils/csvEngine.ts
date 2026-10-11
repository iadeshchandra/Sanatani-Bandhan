import { DevoteeMember, SevaTier, UserRole, ROLE_MIGRATION_MAP } from '../types';

export interface IngestedDevoteeRow {
  fullName: string;
  phone: string;
  gotra: string;
  spiritualName?: string;
  email?: string;
  pin: string;
  sevaTier: string;
  pravara?: string;
  varnaKul?: string;
  address?: string;
  isDuplicate?: boolean;
}

/**
 * Generate cryptographically random 4-digit PIN for devotee self-service
 */
export const generateSecurePIN = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Export data array or headers+rows to CSV and trigger browser download
 */
export function exportToCSV(
  filename: string,
  arg2: Record<string, any>[] | string[],
  arg3?: (string | number)[][]
): void {
  let csvContent = '';

  if (Array.isArray(arg2) && arg2.length > 0 && typeof arg2[0] === 'string' && arg3) {
    // Format: exportToCSV(filename, headers, rows)
    const headers = arg2 as string[];
    const rows = arg3;
    csvContent = [
      headers.join(','),
      ...rows.map((row, idx) =>
        row
          .map((val, idx) => {
            let s = val === null || val === undefined ? '' : String(val);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              s = `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          })
          .join(',')
      ),
    ].join('\n');
  } else if (Array.isArray(arg2) && arg2.length > 0 && typeof arg2[0] === 'object') {
    // Format: exportToCSV(filename, records)
    const records = arg2 as Record<string, any>[];
    const headers = Object.keys(records[0]);
    csvContent = [
      headers.join(','),
      ...records.map((row, idx) =>
        headers
          .map((header, idx) => {
            let val = row[header] ?? '';
            if (typeof val === 'string') {
              val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(',')
      ),
    ].join('\n');
  } else {
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate and download sample CSV template for devotee ingestion
 */
export const generateSampleDevoteeCSV = (): void => {
  const sampleHeaders = ['FullName', 'Phone', 'Gotra', 'SevaTier', 'Email', 'SpiritualName', 'Pravara', 'Address'];
  const sampleRows = [
    ['Sri Rajeshwar Sharma', '+91 98765 43210', 'Kashyapa', 'Ratna', 'rajesh@example.com', 'Ramadasa', 'Trayarsheya', 'Varanasi Sanctum Ward'],
    ['Smt. Sunita Devi', '+91 98111 22334', 'Bharadwaja', 'Vishesh', 'sunita@example.com', 'Radhika Devi', 'Pancharsheya', 'Ayodhya Dham'],
    ['Sri Ananda Mohan Roy', '+91 98300 55667', 'Shandilya', 'Kormi', 'anand@example.com', 'Anandaji', 'Sandilya-Asita-Devala', 'Kolkata Mandir Ward'],
  ];
  exportToCSV('Sanatani_Devotees_Sample_Template.csv', sampleHeaders, sampleRows);
};

/**
 * Parse CSV text for Devotee bulk import
 */
export const parseDevoteeCSV = (
  csvText: string,
  existingPhones: string[] = []
): { rows: IngestedDevoteeRow[]; duplicates: number; valid: number } => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line, idx) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { rows: [], duplicates: 0, valid: 0 };
  }

  const headers = lines[0].split(',').map((h, idx) => h.replace(/^["']|["']$/g, '').trim());
  const existingCleanPhones = new Set(existingPhones.map((p, idx) => p.replace(/\D/g, '')));
  const seenBatchPhones = new Set<string>();

  const rows: IngestedDevoteeRow[] = [];
  let duplicates = 0;
  let valid = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawMatches = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!rawMatches) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const val = rawMatches[idx] || '';
      rowObj[header] = val.replace(/^["']|["']$/g, '').trim();
    });

    const phone = rowObj['Phone'] || rowObj['phone'] || rowObj['Contact'] || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    const cleanPhone = phone.replace(/\D/g, '');

    const isDuplicate = existingCleanPhones.has(cleanPhone) || seenBatchPhones.has(cleanPhone);
    if (isDuplicate) {
      duplicates++;
    } else {
      valid++;
      if (cleanPhone) seenBatchPhones.add(cleanPhone);
    }

    const row: IngestedDevoteeRow = {
      fullName: rowObj['FullName'] || rowObj['fullName'] || rowObj['Name'] || `Devotee ${i}`,
      phone,
      gotra: rowObj['Gotra'] || rowObj['gotra'] || 'Kashyapa',
      spiritualName: rowObj['SpiritualName'] || rowObj['spiritualName'],
      email: rowObj['Email'] || rowObj['email'],
      pin: generateSecurePIN(),
      sevaTier: rowObj['SevaTier'] || rowObj['sevaTier'] || 'Vishesh',
      pravara: rowObj['Pravara'] || rowObj['pravara'],
      varnaKul: rowObj['Kul'] || rowObj['varnaKul'] || 'Sanatan',
      address: rowObj['Address'] || rowObj['address'] || 'Mandir Community Ward',
      isDuplicate,
    };

    rows.push(row);
  }

  return { rows, duplicates, valid };
};

/**
 * Parse generic CSV text into array of objects
 */
export const parseCSVText = (csvText: string): Record<string, string>[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line, idx) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h, idx) => h.replace(/^["']|["']$/g, '').trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const matches = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!matches) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const rawVal = matches[idx] || '';
      rowObj[header] = rawVal.replace(/^["']|["']$/g, '').trim();
    });
    records.push(rowObj);
  }

  return records;
};

/**
 * Bulk convert CSV rows into DevoteeMember records with deduplication
 */
export const bulkIngestDevotees = (
  rawRows: Record<string, string>[],
  existingMembers: DevoteeMember[],
  workspaceId: string
): { created: DevoteeMember[]; duplicatesSkipped: number } => {
  const existingPhones = new Set(existingMembers.map((m, idx) => m.phone.replace(/\D/g, '')));
  const created: DevoteeMember[] = [];
  let duplicatesSkipped = 0;

  rawRows.forEach((row, index) => {
    const rawPhone = row['Phone'] || row['phone'] || row['Contact'] || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    if (!cleanPhone || existingPhones.has(cleanPhone)) {
      duplicatesSkipped++;
      return;
    }

    existingPhones.add(cleanPhone);

    const fullName = row['Name'] || row['FullName'] || row['fullName'] || `Member ${index + 1}`;
    const gotra = row['Gotra'] || row['gotra'] || 'Kashyapa';
    const rawRole = (row['Role'] || row['role'] || 'Devotee').trim();
    const role: UserRole = ROLE_MIGRATION_MAP[rawRole] || ROLE_MIGRATION_MAP[rawRole.toUpperCase()] || 'Devotee';

    const rawTier = row['Tier'] || row['tier'] || 'Sadharan';
    const sevaTier: SevaTier = ['Ratna', 'Vishesh', 'Kormi', 'Sadharan'].includes(rawTier)
      ? (rawTier as SevaTier)
      : 'Sadharan';

    const now = Date.now();
    const newMember: DevoteeMember = {
      id: `dev-${now}-${index}`,
      workspaceId,
      createdAt: now,
      updatedAt: now,
      fullName,
      spiritualName: row['SpiritualName'] || row['spiritualName'] || undefined,
      phone: rawPhone,
      email: row['Email'] || row['email'] || undefined,
      pin: generateSecurePIN(),
      role,
      sevaIndex: Number(row['SevaPoints'] || 100),
      sevaTier,
      gotra,
      pravara: row['Pravara'] || undefined,
      varnaKul: row['Kul'] || row['varnaKul'] || 'Sanatan',
      address: row['Address'] || row['address'] || 'Local Shivalaya Ward',
      birthDate: row['DOB'] || undefined,
      activeStatus: 'Active',
      totalDonated: Number(row['TotalDonated'] || 0),
      volunteerHours: Number(row['SevaHours'] || 0),
      qrCodeRef: `QR-SB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      joinedDate: new Date().toISOString().slice(0, 10),
    };

    created.push(newMember);
  });

  return { created, duplicatesSkipped };
};
