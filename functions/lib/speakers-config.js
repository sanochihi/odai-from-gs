/** speakers.yaml の簡易パース（このプロジェクト用の固定フォーマット） */
export function parseSpeakersYaml(raw) {
    const speakers = [];
    let current = null;

    for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed === "speakers:") continue;

        if (trimmed.startsWith("- ")) {
            if (current) speakers.push(current);
            current = {};
            const rest = trimmed.slice(2).trim();
            const kv = rest.match(/^(\w+):\s*(.*)$/);
            if (kv) current[kv[1]] = stripQuotes(kv[2]);
            continue;
        }

        const kv = trimmed.match(/^(\w+):\s*(.*)$/);
        if (kv && current) {
            current[kv[1]] = stripQuotes(kv[2]);
        }
    }
    if (current) speakers.push(current);
    return speakers;
}

export function stripQuotes(value) {
    return String(value ?? "").replace(/^["']|["']$/g, "").trim();
}

export function resolveEnvString(env, envKey) {
    const key = stripQuotes(envKey);
    if (!key) return "";
    const value = env[key];
    if (value == null || String(value).trim() === "") return "";
    return String(value).trim();
}

export async function loadSpeakersConfig(context) {
    const yamlUrl = new URL("/speakers/speakers.yaml", context.request.url);
    const yamlRes = await fetch(yamlUrl);
    if (!yamlRes.ok) return [];
    return parseSpeakersYaml(await yamlRes.text());
}

export async function getSpeakerEntry(context, label) {
    const entries = await loadSpeakersConfig(context);
    return entries.find((e) => e.label === label) || null;
}

export async function getSpeakerIconSourceUrl(context, label) {
    const entry = await getSpeakerEntry(context, label);
    if (!entry?.iconPathEnv) return null;
    const path = resolveEnvString(context.env, entry.iconPathEnv);
    return path || null;
}

/** ブラウザは同一オリジンのプロキシ経由で画像を読み込む（Drive 直リンク対策） */
export function resolveIconProxyPath(label) {
    if (!label) return null;
    return `/api/speaker-icon/${encodeURIComponent(label)}`;
}

/** Google Drive 共有リンクなどを Worker から取得しやすい URL に変換 */
export function toFetchableImageUrl(sourceUrl) {
    const driveId = extractGoogleDriveFileId(sourceUrl);
    if (driveId) {
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
    }
    return sourceUrl;
}

export function extractGoogleDriveFileId(url) {
    const u = String(url ?? "");
    if (!u.includes("google.com") && !u.includes("googleusercontent.com")) {
        return null;
    }

    let match = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    match = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    match = u.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    return null;
}
