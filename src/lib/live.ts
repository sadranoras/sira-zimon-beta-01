export type JoinMode = 'low' | 'standard' | 'audio';

export const joinModes: Array<{ value: JoinMode; title: string; description: string }> = [
  {
    value: 'low',
    title: 'کم مصرف',
    description: 'مناسب برای اینترنت ضعیف یا موبایل. تصویر با کیفیت ساده و صدای واضح.',
  },
  {
    value: 'standard',
    title: 'استاندارد',
    description: 'تصویر با کیفیت بهتر. برای اینترنت پایدار و پرسرعت.',
  },
  {
    value: 'audio',
    title: 'فقط صدا',
    description: 'کمترین مصرف اینترنت. تصویر ارسال و دریافت نمی شود.',
  },
];

const settingsByMode: Record<JoinMode, string> = {
  low: 'config.resolution=240&config.constraints.video.height.ideal=240&config.disableDeepLinking=true',
  standard: 'config.resolution=480&config.constraints.video.height.ideal=480&config.disableDeepLinking=true',
  audio: 'config.startAudioOnly=true&config.startWithVideoMuted=true&config.disableDeepLinking=true',
};

export function buildRoomUrl(room: string, mode: JoinMode): string {
  return `https://meet.jit.si/${encodeURIComponent(room)}#${settingsByMode[mode]}`;
}
