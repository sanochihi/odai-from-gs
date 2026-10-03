export async function onRequest(context) {
    const SHEET_ID = context.env.SPREADSHEET_ID;

    if (!SHEET_ID) {
        return new Response(JSON.stringify({ error: "SPREADSHEET_ID environment variable is missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

    try {
        const res = await fetch(url);
        const text = await res.text();

        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonString);

        const rows = data.table.rows || [];

        // --- セル値の安全な取得関数 ---
        const getVal = (rowObj, colIdx) => {
            if (!rowObj || !rowObj.c || !rowObj.c[colIdx]) return "";
            const cell = rowObj.c[colIdx];
            return cell.v ?? cell.f ?? "";
        };

        // --- 1. ON-AIR フラグの取得（G2セル）---
        // rows[1] が スプレッドシートの 2行目
        // G列は index 6 (A=0, B=1, C=2, D=3, E=4, F=5, G=6)
        const rawOnAirValue = getVal(rows[1], 6);
        const normalizedVal = String(rawOnAirValue).trim().toLowerCase();
        const isOnAir = ["1", "true", "on"].includes(normalizedVal);

        // --- 2. お題データの抽出 (2行目以降) ---
        const topics = [];

        // i = 1 (スプレッドシートの2行目) からループスタート
        for (let i = 1; i < rows.length; i++) {
            const rowObj = rows[i];
            if (!rowObj) continue;

            const id = getVal(rowObj, 0) || i;               // A列: No.
            const topicText = String(getVal(rowObj, 1)).trim(); // B列: お題
            const isCandidate = String(getVal(rowObj, 2)).trim() === "1"; // C列: 表示
            const isTalking = String(getVal(rowObj, 3)).trim() === "1";   // D列: トーク中
            const isCovered = String(getVal(rowObj, 4)).trim() === "1";   // E列: トーク済み

            // B列にお題があり、C列=1、かつ E列(トーク済み)≠1 のものを追加
            if (topicText && isCandidate && !isCovered) {
                topics.push({
                    id: id,
                    text: topicText,
                    isTalking: isTalking
                });
            }
        }

        return new Response(JSON.stringify({ isOnAir, rawOnAirValue, topics }), {
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