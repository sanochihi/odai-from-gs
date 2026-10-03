export async function onRequest(context) {
    // Cloudflare の環境変数からスプレッドシートIDを取得
    const SHEET_ID = context.env.SPREADSHEET_ID;

    if (!SHEET_ID) {
        return new Response(JSON.stringify({ error: "SPREADSHEET_ID environment variable is missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Google Public Viz API を利用してJSONとして取得（APIキー不要）
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

    try {
        const res = await fetch(url);
        const text = await res.text();

        // Googleの返却値 `/*O_o*/\ngoogle.visualization.Query.setResponse({...});` からJSON部分だけ切り出し
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonString);

        const rows = data.table.rows;

        // G2セル（ON-AIRフラグ）の取得: 2行目(index 1)のG列(index 6)
        const onAirValue = rows[1]?.c[6]?.v ?? 0;
        const isOnAir = String(onAirValue) === "1";

        // お題データのパース (2行目以降)
        const topics = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].c;
            if (!row) continue;

            const id = row[0]?.v ?? i;
            const topicText = row[1]?.v ?? "";
            const isCandidate = String(row[2]?.v ?? "0") === "1";
            const isTalking = String(row[3]?.v ?? "0") === "1";
            const isCovered = String(row[4]?.v ?? "0") === "1";

            // C列=1 かつ E列≠1 のものだけ候補として抽出
            if (topicText && isCandidate && !isCovered) {
                topics.push({
                    id: id,
                    text: topicText,
                    isTalking: isTalking
                });
            }
        }

        return new Response(JSON.stringify({ isOnAir, topics }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}