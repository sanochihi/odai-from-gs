import {
    getSpeakerIconSourceUrl,
    toFetchableImageUrl
} from "../../lib/speakers-config.js";

export async function onRequest(context) {
    const label = context.params.label;

    try {
        const sourceUrl = await getSpeakerIconSourceUrl(context, label);
        if (!sourceUrl) {
            return new Response("Icon not configured", { status: 404 });
        }

        const resolved = toFetchableImageUrl(sourceUrl);
        const fetchUrl = resolved.startsWith("http")
            ? resolved
            : new URL(resolved, context.request.url).toString();

        const upstream = await fetch(fetchUrl, {
            redirect: "follow",
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; piyochihi/1.0)"
            }
        });

        if (!upstream.ok) {
            return new Response("Failed to fetch icon", { status: 502 });
        }

        const contentType = upstream.headers.get("Content-Type") || "application/octet-stream";
        if (contentType.includes("text/html")) {
            return new Response("Upstream returned HTML (check sharing settings)", { status: 502 });
        }

        return new Response(upstream.body, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=300",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
}
