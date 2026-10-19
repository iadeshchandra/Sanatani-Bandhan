/**
 * video/index.ts — public surface of the gentle video upload guidance module.
 */
export {
  isVideoFile,
  resolveShareTarget,
  isPlausibleChannelUrl,
  getRememberedChannelUrl,
  setRememberedChannelUrl,
  clearRememberedChannelUrl,
  type VideoUploadContext,
  type ShareTarget,
  type PickedFileLike,
} from './uploadGuidance';
export { vg, type VideoGuideLang } from './i18n';
export { VideoGuidanceSheet, rememberChannelUrl } from './VideoGuidanceSheet';
