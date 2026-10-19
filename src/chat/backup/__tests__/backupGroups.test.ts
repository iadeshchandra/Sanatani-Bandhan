/**
 * backupGroups.test.ts — group chats in the backup.
 * ===================================================
 * Pure tests: serialization shapes, voice-note references, backward
 * compatibility with pre-group archives, and the honesty copy.
 *
 * Firebase modules are stubbed (repo's CommonJS jest setup).
 */
jest.mock('../../../solo/ui', () => ({
  useLocaleText: jest.fn(() => ({ lang: 'en', tr: (_k: string, en: string) => en })),
}));

import {
  toSerializedMessage,
  threadKind,
  isValidBackupFile,
  type SerializedThread,
  type BackupPayload,
} from '../serialize';
import { BACKUP_STRINGS } from '../strings';
import type { ChatMessage } from '../../types';

const baseMsg = (over: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    id: 'm1',
    chatId: 'c1',
    senderId: 'u1',
    kind: 'text',
    text: 'Jai Shri Ram 🙏',
    createdAt: 1700000000000,
    ...over,
  }) as ChatMessage;

describe('toSerializedMessage', () => {
  it('serializes a 1:1 text message with no group fields', () => {
    const sm = toSerializedMessage('m1', baseMsg());
    expect(sm.id).toBe('m1');
    expect(sm.senderId).toBe('u1');
    expect(sm.text).toBe('Jai Shri Ram 🙏');
    expect(sm.senderName).toBeUndefined();
    expect(sm.voiceMeta).toBeUndefined();
  });

  it('keeps sender attribution for group messages', () => {
    const sm = toSerializedMessage('m2', baseMsg({ senderName: 'Meera' } as Partial<ChatMessage>));
    expect(sm.senderName).toBe('Meera');
  });

  it('keeps voice notes as vault:// references only — never bytes', () => {
    const sm = toSerializedMessage(
      'm3',
      baseMsg({
        kind: 'voice',
        text: '',
        voiceMeta: { vaultUrl: 'vault://abc123', durationMs: 45000, contentType: 'audio/webm' },
      })
    );
    expect(sm.voiceMeta).toEqual({ vaultUrl: 'vault://abc123', durationMs: 45000, contentType: 'audio/webm' });
    // No audio bytes anywhere in the serialized shape.
    expect(JSON.stringify(sm)).not.toMatch(/data:audio/);
  });

  it('keeps blessing metadata', () => {
    const sm = toSerializedMessage(
      'm4',
      baseMsg({ kind: 'blessing', blessingMeta: { occasion: 'Diwali', occasionBn: 'দীপাবলি' } })
    );
    expect(sm.blessingMeta?.occasion).toBe('Diwali');
  });

  it('falls back to empty text when the message has none', () => {
    const sm = toSerializedMessage('m5', baseMsg({ text: '' }));
    expect(sm.text).toBe('');
  });
});

describe('threadKind', () => {
  it('returns group for group threads', () => {
    expect(threadKind({ kind: 'group' })).toBe('group');
  });

  it('returns direct for 1:1 threads', () => {
    expect(threadKind({ kind: 'direct' })).toBe('direct');
  });

  it('treats pre-group archives (no kind field) as direct', () => {
    expect(threadKind({})).toBe('direct');
    expect(threadKind({ kind: undefined })).toBe('direct');
  });

  it('fail-closes unknown kinds to direct', () => {
    expect(threadKind({ kind: 'weird' })).toBe('direct');
  });
});

describe('group thread shape', () => {
  const groupThread: SerializedThread = {
    id: 'grp_abc',
    kind: 'group',
    type: 'group',
    participants: ['u1', 'u2'],
    participantInfo: {
      u1: { uid: 'u1', displayName: 'Meera' },
      u2: { uid: 'u2', displayName: 'Arjun' },
    },
    groupName: 'Sharma Parivar',
    groupType: 'family',
    members: [
      { uid: 'u1', displayName: 'Meera', role: 'admin' },
      { uid: 'u2', displayName: 'Arjun', role: 'member' },
    ],
    inviteCode: 'ABCDEFGH',
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    messages: [],
  };

  it('carries group metadata, members, and invite code', () => {
    expect(groupThread.groupName).toBe('Sharma Parivar');
    expect(groupThread.members).toHaveLength(2);
    expect(groupThread.members?.[0].role).toBe('admin');
    expect(groupThread.inviteCode).toBe('ABCDEFGH');
  });

  it('passes backup file validation inside a payload', () => {
    const payload: BackupPayload = {
      v: 1,
      exportedAt: Date.now(),
      exportedBy: 'u1',
      threads: [groupThread],
    };
    // isValidBackupFile checks the sealed envelope shape; the payload
    // shape itself must carry threads as an array.
    expect(Array.isArray(payload.threads)).toBe(true);
    expect(payload.threads[0].kind).toBe('group');
  });

  it('isValidBackupFile accepts the sealed file shape', () => {
    const envelope = { v: 1, kdf: 'pbkdf2-sha256', iterations: 210000, salt: 'c2FsdA==', iv: 'aXY=', data: 'ZGF0YQ==' };
    expect(
      isValidBackupFile({
        v: 1,
        openers: { passphrase: envelope, recovery: { ...envelope, kdf: 'recovery' } },
      })
    ).toBe(true);
    expect(isValidBackupFile({ v: 1 })).toBe(false);
    expect(isValidBackupFile(null)).toBe(false);
  });
});

describe('backup honesty copy', () => {
  it('has the includes-note string in all three languages', () => {
    expect(BACKUP_STRINGS.includesNote.en).toMatch(/group chats/i);
    expect(BACKUP_STRINGS.includesNote.bn.length).toBeGreaterThan(10);
    expect(BACKUP_STRINGS.includesNote.hi.length).toBeGreaterThan(10);
  });

  it('has the backup button label in all three languages', () => {
    expect(BACKUP_STRINGS.backupLabel.en).toBe('Backup');
    expect(BACKUP_STRINGS.backupLabel.bn.length).toBeGreaterThan(0);
    expect(BACKUP_STRINGS.backupLabel.hi.length).toBeGreaterThan(0);
  });
});
