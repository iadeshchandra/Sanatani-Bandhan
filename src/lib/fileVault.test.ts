/**
 * Zero-Cost File Vault — unit tests.
 * Firestore + IndexedDB are faked in-memory; crypto.subtle is real (node ≥18).
 */

// ---------------------------------------------------------------------------
// Fakes (jest.mock factories may only reference `mock`-prefixed variables)
// ---------------------------------------------------------------------------
const mockStore = new Map<string, any>();
const mockIdb = new Map<string, any>();

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: any, ...parts: string[]) => ({ __path: parts.join('/') })),
  getDoc: jest.fn(async (ref: any) => {
    const data = mockStore.get(ref.__path);
    return { exists: () => data !== undefined, data: () => data };
  }),
  setDoc: jest.fn(async (ref: any, data: any) => {
    mockStore.set(ref.__path, data);
  }),
  writeBatch: jest.fn(() => {
    const ops: Array<() => void> = [];
    return {
      set: (ref: any, data: any) => {
        ops.push(() => mockStore.set(ref.__path, data));
      },
      delete: (ref: any) => {
        ops.push(() => mockStore.delete(ref.__path));
      },
      commit: async () => {
        ops.forEach((op) => op());
      },
    };
  }),
  serverTimestamp: jest.fn(() => ({ __ts: Date.now() })),
}));

jest.mock('./firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid-1' } },
}));

jest.mock('./fileVaultIdb', () => ({
  putPrivateFile: jest.fn(async (rec: any) => {
    mockIdb.set(rec.fileId, rec);
  }),
  getPrivateFile: jest.fn(async (id: string) => mockIdb.get(id) ?? null),
  deletePrivateFile: jest.fn(async (id: string) => {
    mockIdb.delete(id);
  }),
}));

// URL.createObjectURL does not exist in node — stub it.
if (typeof URL.createObjectURL !== 'function') {
  (URL as any).createObjectURL = () => `blob:mock-${Math.random()}`;
  (URL as any).revokeObjectURL = () => undefined;
}

import { setDoc, getDoc } from 'firebase/firestore';
import { putPrivateFile } from './fileVaultIdb';
import {
  sha256Hex,
  fileIdFor,
  bytesToBase64,
  base64ToBytes,
  splitIntoChunks,
  computeTargetSize,
  vaultUrl,
  isVaultUrl,
  fileIdFromVaultUrl,
  uploadFile,
  getFile,
  deleteFile,
  VAULT_CHUNK_B64,
  __clearVaultCaches,
} from './fileVault';

const setDocMock = setDoc as jest.Mock;
const putPrivateFileMock = putPrivateFile as jest.Mock;

beforeEach(() => {
  mockStore.clear();
  mockIdb.clear();
  __clearVaultCaches();
  jest.clearAllMocks();
});

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = (i * 31 + 7) % 256;
  return b;
}

/* ------------------------- pure helpers ------------------------- */

describe('sha256Hex', () => {
  it('matches the known SHA-256 vector for "abc"', async () => {
    const bytes = new Uint8Array([97, 98, 99]);
    expect(await sha256Hex(bytes)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

describe('base64 round-trip', () => {
  it('encodes and decodes identical bytes', () => {
    const bytes = randomBytes(10000);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('splitIntoChunks', () => {
  it('splits and rejoins losslessly', () => {
    const b64 = bytesToBase64(randomBytes(600 * 1024));
    const chunks = splitIntoChunks(b64, VAULT_CHUNK_B64);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= VAULT_CHUNK_B64)).toBe(true);
    expect(base64ToBytes(chunks.join(''))).toEqual(base64ToBytes(b64));
  });
});

describe('computeTargetSize', () => {
  it('downscales on the longest edge only', () => {
    expect(computeTargetSize(2000, 1000, 1280)).toEqual({ width: 1280, height: 640 });
    expect(computeTargetSize(1000, 2000, 1280)).toEqual({ width: 640, height: 1280 });
  });
  it('leaves small images untouched', () => {
    expect(computeTargetSize(400, 300, 1280)).toEqual({ width: 400, height: 300 });
  });
});

describe('vault url helpers', () => {
  it('round-trips scheme correctly', () => {
    const url = vaultUrl('fv_abc123');
    expect(isVaultUrl(url)).toBe(true);
    expect(fileIdFromVaultUrl(url)).toBe('fv_abc123');
    expect(isVaultUrl('https://x')).toBe(false);
    expect(isVaultUrl(null)).toBe(false);
  });
  it('namespaces private ids separately from public', () => {
    const pub = fileIdFor('public', 'a'.repeat(64));
    const priv = fileIdFor('private', 'a'.repeat(64));
    expect(pub).not.toBe(priv);
    expect(priv).toContain('_p_');
  });
});

/* ------------------------- upload / dedupe ------------------------- */

describe('uploadFile (public, small)', () => {
  it('stores a single doc and dedupes the second identical upload', async () => {
    const blob = new Blob([randomBytes(50 * 1024)], { type: 'application/octet-stream' });
    const opts = { visibility: 'public' as const, category: 'avatar' as const, ownerUid: 'test-uid-1' };

    const first = await uploadFile(blob, opts);
    expect(first.url).toBe(vaultUrl(first.fileId));
    const writesAfterFirst = setDocMock.mock.calls.length;
    expect(writesAfterFirst).toBe(1);

    const second = await uploadFile(blob, opts);
    expect(second.fileId).toBe(first.fileId); // same content → same id
    // Dedupe hit: no additional document write.
    expect(setDocMock.mock.calls.length).toBe(writesAfterFirst);

    const file = await getFile(first.fileId);
    expect(file).not.toBeNull();
    expect(file!.size).toBe(50 * 1024);
    expect(new Uint8Array(await file!.blob.arrayBuffer())).toEqual(
      new Uint8Array(await blob.arrayBuffer())
    );
  });
});

describe('uploadFile (public, chunked)', () => {
  it('round-trips a 1.5MB file through chunks with identical bytes', async () => {
    const original = randomBytes(1.5 * 1024 * 1024);
    const blob = new Blob([original], { type: 'application/octet-stream' });
    const { fileId } = await uploadFile(blob, {
      visibility: 'public',
      category: 'document',
      ownerUid: 'test-uid-1',
    });

    const meta = mockStore.get(`fileVault/${fileId}`);
    expect(meta.chunkCount).toBeGreaterThan(1);
    expect(meta.data).toBeUndefined(); // bytes live in chunks, not metadata

    const file = await getFile(fileId);
    expect(file).not.toBeNull();
    expect(new Uint8Array(await file!.blob.arrayBuffer())).toEqual(original);
  }, 30000);
});

describe('uploadFile (private)', () => {
  it('never puts bytes in Firestore — device only, metadata pointer', async () => {
    const blob = new Blob([randomBytes(200 * 1024)], { type: 'audio/webm' });
    const { fileId } = await uploadFile(blob, {
      visibility: 'private',
      category: 'voice',
      ownerUid: 'test-uid-1',
    });

    // IndexedDB received the bytes…
    expect(putPrivateFileMock).toHaveBeenCalledTimes(1);
    const rec = putPrivateFileMock.mock.calls[0][0];
    expect(rec.bytes.length).toBe(200 * 1024);

    // …but Firestore got metadata only (no `data`, no chunks).
    const meta = mockStore.get(`fileVault/${fileId}`);
    expect(meta.localOnly).toBe(true);
    expect(meta.data).toBeUndefined();
    expect(meta.chunkCount).toBe(0);
    for (const key of mockStore.keys()) {
      expect(key.startsWith(`fileVault/${fileId}/chunks/`)).toBe(false);
    }

    // And the bytes come back intact from the device store.
    const file = await getFile(fileId);
    expect(file).not.toBeNull();
    expect(file!.contentType).toBe('audio/webm');
    expect(new Uint8Array(await file!.blob.arrayBuffer())).toEqual(
      new Uint8Array(await blob.arrayBuffer())
    );
  });

  it('private and public copies of identical bytes get separate ids', async () => {
    const bytes = randomBytes(1024);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const pub = await uploadFile(blob, { visibility: 'public', category: 'other', ownerUid: 'test-uid-1' });
    const priv = await uploadFile(blob, { visibility: 'private', category: 'other', ownerUid: 'test-uid-1' });
    expect(pub.fileId).not.toBe(priv.fileId);
  });
});

describe('deleteFile', () => {
  it('owner can delete; non-owner is refused', async () => {
    const blob = new Blob([randomBytes(1024)], { type: 'application/octet-stream' });
    const { fileId } = await uploadFile(blob, {
      visibility: 'public',
      category: 'other',
      ownerUid: 'test-uid-1',
    });
    await expect(deleteFile(fileId, 'intruder')).rejects.toThrow('filevault/forbidden');
    await deleteFile(fileId, 'test-uid-1');
    expect(mockStore.get(`fileVault/${fileId}`)).toBeUndefined();
    expect(await getFile(fileId)).toBeNull();
  });
});

describe('uploadFile validation', () => {
  it('requires an ownerUid', async () => {
    const blob = new Blob([randomBytes(10)], { type: 'application/octet-stream' });
    await expect(
      uploadFile(blob, { visibility: 'public', category: 'other', ownerUid: '' })
    ).rejects.toThrow('filevault/auth-required');
  });

  it('requires a tenantId for crisis visibility', async () => {
    const blob = new Blob([randomBytes(10)], { type: 'application/octet-stream' });
    await expect(
      uploadFile(blob, { visibility: 'crisis', category: 'voice', ownerUid: 'test-uid-1' })
    ).rejects.toThrow('filevault/tenant-required');
  });
});

describe('uploadFile (crisis)', () => {
  it('uploads bytes to Firestore with visibility + tenantId in metadata', async () => {
    const blob = new Blob([randomBytes(50 * 1024)], { type: 'audio/webm' });
    const { fileId, url } = await uploadFile(blob, {
      visibility: 'crisis',
      category: 'voice',
      ownerUid: 'test-uid-1',
      tenantId: 'ws-test-123',
      fileName: 'sos-voice-evt1.webm',
    });

    expect(url).toBe(`vault://${fileId}`);

    // Bytes ARE in Firestore (single doc) — the response team can read them.
    const meta = mockStore.get(`fileVault/${fileId}`);
    expect(meta).toBeDefined();
    expect(meta.visibility).toBe('crisis');
    expect(meta.tenantId).toBe('ws-test-123');
    expect(meta.localOnly).toBeFalsy();
    expect(typeof meta.data).toBe('string');
    expect(meta.data.length).toBeGreaterThan(0);

    // Nothing went to the device store.
    expect(putPrivateFileMock).not.toHaveBeenCalled();

    // And the bytes round-trip intact.
    const file = await getFile(fileId);
    expect(file).not.toBeNull();
    expect(file!.contentType).toBe('audio/webm');
    expect(new Uint8Array(await file!.blob.arrayBuffer())).toEqual(
      new Uint8Array(await blob.arrayBuffer())
    );
  });
});
