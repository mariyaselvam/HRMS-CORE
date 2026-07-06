import fs from 'fs';

/**
 * Finds an installed Chromium-based browser on the system.
 * Tries Edge first (always available on Windows 10/11), then Chrome.
 * Returns empty string if none found — puppeteer will use its bundled Chromium.
 */
export function findSystemBrowser(): string {
    const candidates: string[] = [
        // Microsoft Edge (always on Win10/11)
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        // Google Chrome
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        // Chrome via user profile
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        // Brave
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    ].filter(Boolean);

    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        } catch {
            // ignore permission errors
        }
    }

    return ''; // fall back to puppeteer bundled chromium
}
