/**
 * groups/index.ts — public surface of the group chats module.
 */
export type { GroupChat, GroupMember, GroupMessage, GroupType, GroupSystemKind } from './types';
export {
  GROUP_TYPES,
  generateInviteCode,
  newGroupId,
  isGroupMember,
  isGroupAdmin,
  groupTypeLabel,
  groupTypeIcon,
  systemMessageText,
  typingLabel,
  validGroupName,
  validInviteCode,
  groupMessagePreview,
} from './types';
export {
  createGroup,
  joinGroupViaCode,
  addGroupMember,
  removeGroupMember,
  promoteMember,
  renameGroup,
  regenerateInviteCode,
  leaveGroup,
  deleteGroup,
  sendGroupMessage,
  postSystemMessage,
  markGroupRead,
  markGroupDelivered,
  setGroupTyping,
  setGroupArchived,
  subscribeGroups,
  subscribeGroup,
  subscribeGroupMessages,
  subscribeNewGroupMessages,
  getGroup,
} from './groupService';
export {
  useGroupList,
  useGroup,
  useGroupMessages,
  useGroupTypingLabel,
  useGroupUnreadTotal,
  useGroupArchivedSplit,
  useGroupNotify,
  useSelfParticipant,
  markGroupOpen,
  isGroupOpen,
} from './useGroups';
export { GroupThread, GroupAvatar } from './GroupThread';
export { GroupList } from './GroupList';
export { CreateGroupSheet } from './CreateGroupSheet';
export { JoinGroupSheet } from './JoinGroupSheet';
export { GroupInfoSheet } from './GroupInfoSheet';
export { gt, groupLangOf } from './i18n';
