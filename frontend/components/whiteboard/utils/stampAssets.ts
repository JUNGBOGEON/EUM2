// Stamp icons using PNG files from /stamps folder
export const STAMP_ICONS: Record<string, string> = {
    'thumbs-up': '/stamps/thumb_up.png',
    'heart': '/stamps/heart.png',
    'star': '/stamps/star.png',
    'check': '/stamps/check.png',
    'uncheck': '/stamps/uncheck.png',
    'exclamation': '/stamps/emark.png',
    'question': '/stamps/qmark.png',
    'smile': '/stamps/smile.png',
};

// Display names for UI
export const STAMP_NAMES: Record<string, string> = {
    'thumbs-up': '좋아요',
    'heart': '하트',
    'star': '별',
    'check': '체크',
    'uncheck': '취소',
    'exclamation': '느낌표',
    'question': '물음표',
    'smile': '스마일',
};

// Stamp order for radial menu (clockwise from top)
export const STAMP_ORDER = [
    'thumbs-up',
    'heart',
    'star',
    'check',
    'uncheck',
    'exclamation',
    'question',
    'smile',
];

// Legacy exports for backward compatibility (can be removed after migration)
export const STAMP_PATHS: Record<string, string> = {};
export const STAMP_COLORS: Record<string, number> = {};
