import { loadTopicsSizeConfig } from "../lib/topics-config.js";

const JSON_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
};

export async function onRequest(context) {
    try {
        const config = await loadTopicsSizeConfig(context);
        return new Response(JSON.stringify(config), { headers: JSON_HEADERS });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: JSON_HEADERS
        });
    }
}
