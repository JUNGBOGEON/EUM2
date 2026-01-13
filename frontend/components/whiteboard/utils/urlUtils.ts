
export const getProxiedUrl = (url: string) => {
    if (!url) return '';
    // If it's already a relative path or data URL, return as is
    if (url.startsWith('/') || url.startsWith('data:')) {
        return url;
    }
    // If it's an http/https URL, proxy it
    if (url.startsWith('http://') || url.startsWith('https://')) {
        // Avoid double proxying if somehow passed
        if (url.includes('/api/image-proxy')) return url;

        return `/api/image-proxy?url=${encodeURIComponent(url)}&ext=.png`;
    }
    return url;
};
