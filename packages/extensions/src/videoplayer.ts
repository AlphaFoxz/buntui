export type {
  VideoPlayerWidgetOptions,
  VideoPlayerState,
  VideoPlayerColorScheme,
} from './widgets/videoplayer/types';

export {VideoPlayerWidget, createVideoPlayerWidget} from './widgets/videoplayer/VideoPlayerWidget';

// Default export = creator function, for SFC default import usage:
//   import VideoPlayer from '@buntui/extensions/videoplayer'
export {createVideoPlayerWidget as default} from './widgets/videoplayer/VideoPlayerWidget';
