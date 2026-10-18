/**
 * sangam/watch/index.ts — public surface of the Sangam Watch module.
 */
export * from './types';
export { wt } from './i18n';
export { WatchTab } from './WatchTab';
export { VideoCard } from './VideoCard';
export { ShareVideoSheet } from './ShareVideoSheet';
export { shareVideo, listVideos, subscribeVideos, reportVideo, deleteVideo, getLiveStreams, subscribeLiveStreams } from './watchService';
