/**
 * groups/types.ts — Group chats: shared type contract.
 * ======================================================
 * Private-by-default group conversations for families, satsang circles,
 * temple communities, and yatra groups. No public discovery, no
 * join-by-search — invite code/link only.
 *
 * Privacy law: memberIds on the group doc is the single source of truth
 * for the Firestore rules `in` checks. Every read/write path filters
 * through isGroupMember().
 */
import type { ChatMessage, ChatParticipant, MessageKind } from '../types';

/** Group flavour — drives the icon, the default name hints, and the invite framing. */
export type GroupType = 'family' | 'satsang' | 'temple' | 'yatra' | 'custom';

export const GROUP_TYPES: GroupType[] = ['family', 'satsang', 'temple', 'yatra', 'custom'];

export interface GroupMember {
  uid: string;
  /** 'admin' can add/remove members, rename, regenerate invite, delete. */
  role: 'admin' | 'member';
  joinedAt: number;
  addedBy?: string;
}

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  /** Single source of truth for rules membership checks. */
  memberIds: string[];
  adminIds: string[];
  memberInfo: Record<string, ChatParticipant>;
  /** Invite code — shareable, regenerable, never publicly listed. */
  inviteCode: string;
  lastMessage?: string;
  lastMessageAt?: number;
  /** uid -> unread count */
  unreadCounts?: Record<string, number>;
  /** uid -> timestamp of last read */
  lastReadAt?: Record<string, number>;
  /** uid -> timestamp the device last received messages */
  lastDeliveredAt?: Record<string, number>;
  /** uid -> typing boolean (ephemeral) */
  typing?: Record<string, boolean>;
  archivedBy?: string[];
}

/** Group messages carry sender attribution — every bubble knows its voice. */
export interface GroupMessage extends ChatMessage {
  groupId: string;
  senderName: string;
  senderAvatar?: string;
}

export type GroupSystemKind =
  | 'created'
  | 'joined'
  | 'left'
  | 'added'
  | 'removed'
  | 'renamed'
  | 'promoted';

/* ------------------------------------------------------------------ */
/* Pure helpers — no Firebase, fully unit-testable                     */
/* ------------------------------------------------------------------ */

/** 8-char invite code from an unambiguous alphabet (no 0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateInviteCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Deterministic-ish group id: creator + timestamp + random suffix. */
export function newGroupId(creatorUid: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `grp_${Date.now().toString(36)}_${suffix}`;
}

export function isGroupMember(group: Pick<GroupChat, 'memberIds'> | null | undefined, uid: string): boolean {
  if (!group || !uid) return false;
  return group.memberIds.includes(uid);
}

export function isGroupAdmin(group: Pick<GroupChat, 'adminIds'> | null | undefined, uid: string): boolean {
  if (!group || !uid) return false;
  return group.adminIds.includes(uid);
}

/** Display name for a group type, EN/HI/BN. */
export function groupTypeLabel(type: GroupType, lang: 'en' | 'bn' | 'hi' = 'en'): string {
  const labels: Record<GroupType, [string, string, string]> = {
    family: ['Family', 'পরিবার', 'परिवार'],
    satsang: ['Satsang', 'সৎসঙ্গ', 'सत्संग'],
    temple: ['Temple', 'মন্দির', 'मंदिर'],
    yatra: ['Yatra', 'যাত্রা', 'यात्रा'],
    custom: ['Group', 'গ্রুপ', 'समूह'],
  };
  const [en, bn, hi] = labels[type];
  return lang === 'bn' ? bn : lang === 'hi' ? hi : en;
}

/** Icon for a group type. */
export function groupTypeIcon(type: GroupType): string {
  switch (type) {
    case 'family':
      return '🏠';
    case 'satsang':
      return '🪔';
    case 'temple':
      return '🛕';
    case 'yatra':
      return '🚩';
    default:
      return '👥';
  }
}

/**
 * Warm Sanatani system messages — never "User X joined".
 * kind: created | joined | left | added | removed | renamed | promoted
 */
export function systemMessageText(
  kind: GroupSystemKind,
  actorName: string,
  targetName?: string,
  lang: 'en' | 'bn' | 'hi' = 'en',
): string {
  const safe = (s: string) => (s || 'A devotee').slice(0, 40);
  const actor = safe(actorName);
  const target = safe(targetName || '');
  switch (kind) {
    case 'created':
      return lang === 'bn'
        ? `🙏 ${actor} এই শুভ সমাবেশের সূচনা করলেন`
        : lang === 'hi'
          ? `🙏 ${actor} ने इस शुभ संगम की शुरुआत की`
          : `🙏 ${actor} began this blessed gathering`;
    case 'joined':
      return lang === 'bn'
        ? `🙏 ${actor} সংঘে যোগ দিলেন — স্বাগতম!`
        : lang === 'hi'
          ? `🙏 ${actor} संघ में शामिल हुए — स्वागत है!`
          : `🙏 ${actor} joined the sangha — welcome!`;
    case 'left':
      return lang === 'bn'
        ? `${actor} বিদায় নিলেন — শুভ যাত্রা 🙏`
        : lang === 'hi'
          ? `${actor} विदा हुए — शुभ यात्रा 🙏`
          : `${actor} took leave — shubh yatra 🙏`;
    case 'added':
      return lang === 'bn'
        ? `🙏 ${actor} ${target}-কে আমন্ত্রণ জানালেন`
        : lang === 'hi'
          ? `🙏 ${actor} ने ${target} को आमंत्रित किया`
          : `🙏 ${actor} invited ${target}`;
    case 'removed':
      return lang === 'bn'
        ? `${target} আর এই গ্রুপের সদস্য নন`
        : lang === 'hi'
          ? `${target} अब इस समूह के सदस्य नहीं हैं`
          : `${target} is no longer in this group`;
    case 'renamed':
      return lang === 'bn'
        ? `🪔 গ্রুপের নতুন নাম: ${target}`
        : lang === 'hi'
          ? `🪔 समूह का नया नाम: ${target}`
          : `🪔 The group is now called ${target}`;
    case 'promoted':
      return lang === 'bn'
        ? `🌟 ${target} এখন পরিচালক — অভিনন্দন!`
        : lang === 'hi'
          ? `🌟 ${target} अब प्रबंधक हैं — बधाई!`
          : `🌟 ${target} is now an admin — congratulations!`;
  }
}

/**
 * Typing label for groups: "X is typing…" or "3 people typing…".
 * Returns null when nobody (other than me) is typing.
 */
export function typingLabel(
  typing: Record<string, boolean> | undefined,
  memberInfo: Record<string, ChatParticipant> | undefined,
  myUid: string,
  lang: 'en' | 'bn' | 'hi' = 'en',
): string | null {
  if (!typing) return null;
  const others = Object.keys(typing).filter((u) => u !== myUid && typing[u]);
  if (others.length === 0) return null;
  if (others.length === 1) {
    const name = (memberInfo?.[others[0]]?.displayName || 'Someone').split(' ')[0];
    return lang === 'bn'
      ? `${name} লিখছেন…`
      : lang === 'hi'
        ? `${name} लिख रहे हैं…`
        : `${name} is typing…`;
  }
  return lang === 'bn'
    ? `${others.length} জন লিখছেন…`
    : lang === 'hi'
      ? `${others.length} लोग लिख रहे हैं…`
      : `${others.length} people typing…`;
}

/** Validate a group name: 2–60 chars, no leading/trailing space games. */
export function validGroupName(name: string): boolean {
  const t = name.trim();
  return t.length >= 2 && t.length <= 60;
}

/** Validate an invite code: 8 chars from the code alphabet. */
export function validInviteCode(code: string): boolean {
  return /^[A-Z2-9]{8}$/.test(code.trim().toUpperCase());
}

/** Preview text for the thread list — system messages render warmly. */
export function groupMessagePreview(m: { kind: MessageKind; text: string }): string {
  if (m.kind === 'blessing') return `🪔 ${m.text}`;
  if (m.kind === 'system') return m.text;
  return m.text;
}
