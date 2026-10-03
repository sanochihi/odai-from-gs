import {
    loadSpeakersConfig,
    resolveEnvString,
    resolveIconProxyPath
} from "../lib/speakers-config.js";

const JSON_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};

function resolveIconUrl(label, iconPathEnv, env) {
    const path = resolveEnvString(env, iconPathEnv);
    if (!path) return null;
    return resolveIconProxyPath(label);
}

export async function onRequest(context) {
    try {
        const parsed = await loadSpeakersConfig(context);
        if (parsed.length === 0) {
            return new Response(JSON.stringify({ speakers: [] }), { headers: JSON_HEADERS });
        }

        const speakers = parsed.map((entry) => ({
            label: entry.label || "",
            name: resolveEnvString(context.env, entry.nameEnv),
            iconUrl: resolveIconUrl(entry.label, entry.iconPathEnv, context.env)
        }));

        return new Response(JSON.stringify({ speakers }), { headers: JSON_HEADERS });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: JSON_HEADERS
        });
    }
}
