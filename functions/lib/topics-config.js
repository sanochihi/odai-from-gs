import { stripQuotes } from "./speakers-config.js";

/** 旧サイズ × 0.8 を既定値（topics.yaml 未配置時） */
export const DEFAULT_TOPICS_SIZE_CONFIG = {
    mediumRadiusMin: 56,
    mediumRadiusMax: 88,
    mediumRadiusBase: 288,
    largeMediumScale: 1.35,
    smallMaxRatio: 0.52,
    smallMinRatio: 0.32,
    smallDiameterScale: 2,
    smallMinRadiusFloor: 38,
    smallCapRadiusFloor: 45,
    viewportEdgePadding: 24,
    speakerAvatarRadiusMin: 70,
    speakerAvatarRadiusMax: 110,
    speakerAvatarRadiusBase: 360
};

const NUMERIC_KEYS = new Set(Object.keys(DEFAULT_TOPICS_SIZE_CONFIG));

export function parseTopicsYaml(raw) {
    const config = { ...DEFAULT_TOPICS_SIZE_CONFIG };

    for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const kv = trimmed.match(/^(\w+):\s*(.+)$/);
        if (!kv || !NUMERIC_KEYS.has(kv[1])) continue;

        const num = Number(stripQuotes(kv[2]));
        if (Number.isFinite(num)) config[kv[1]] = num;
    }

    return config;
}

export async function loadTopicsSizeConfig(context) {
    const yamlUrl = new URL("/topics/topics.yaml", context.request.url);
    const yamlRes = await fetch(yamlUrl);
    if (!yamlRes.ok) return { ...DEFAULT_TOPICS_SIZE_CONFIG };

    return parseTopicsYaml(await yamlRes.text());
}
