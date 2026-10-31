// A file's family, by extension, for its icon tile (until real icons, phase 3).

export type Family = 'doc' | 'pdf' | 'sheet' | 'slides' | 'image' | 'video' | 'audio' | 'code' | 'archive' | 'exe' | 'text' | 'other';

const FAMILIES: Record<Family, string[]> = {
  doc: ['doc', 'docx', 'odt', 'rtf', 'wps', 'pages'],
  pdf: ['pdf'],
  sheet: ['xls', 'xlsx', 'xlsm', 'csv', 'ods', 'numbers'],
  slides: ['ppt', 'pptx', 'odp', 'key'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'ico', 'tif', 'tiff', 'psd', 'raw', 'avif'],
  video: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv', 'm4v'],
  audio: ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac', 'opus', 'wma'],
  code: ['js', 'ts', 'tsx', 'jsx', 'py', 'c', 'cpp', 'h', 'hpp', 'cs', 'java', 'go', 'rs', 'rb', 'php', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'toml', 'sh', 'ps1', 'bat', 'cmd', 'sql', 'kt', 'swift', 'vue', 'lua'],
  archive: ['zip', '7z', 'rar', 'tar', 'gz', 'xz', 'bz2', 'iso', 'cab'],
  exe: ['exe', 'msi', 'msix', 'appx', 'lnk', 'com', 'scr'],
  text: ['txt', 'md', 'log', 'ini', 'cfg', 'conf'],
  other: [],
};

const BY_EXTENSION = new Map<string, Family>();
for (const [family, list] of Object.entries(FAMILIES) as [Family, string[]][]) for (const ext of list) BY_EXTENSION.set(ext, family);

export function familyOf(name: string): Family {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return 'other';
  return BY_EXTENSION.get(name.slice(dot + 1).toLowerCase()) ?? 'other';
}
