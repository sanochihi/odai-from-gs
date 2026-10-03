export async function onRequest(context) {
    const SHEET_ID = context.env.SPREADSHEET_ID;

    if (!SHEET_ID) {
        return new Response(JSON.stringify({ error: "SPREADSHEET_ID environment variable is missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    // &headers=1 を明示して 1 行目をヘッダーとして読み込む
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1`;

    try {
        const res = await fetch(url);
        const text = await res.text();

        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonString);

        const rows = data.table.rows || [];

        // セル値取得の補助関数
        const getVal = (rowObj, colIdx) => {
            if (colIdx < 0 || !rowObj || !rowObj.c || !rowObj.c[colIdx]) return "";
            const cell = rowObj.c[colIdx];
            return cell.v ?? cell.f ?? "";
        };

        // gviz の rows[].c は先頭(A)列が含まれないことがあるため、
        // スプレッドシート上の列番号（A=1, B=2, …）→ 配列 index に変換する（B列 = index 0）
        const colIndex = (colNumber1Based) => colNumber1Based - 2;

        // --- 1. ON-AIR フラグの取得（G2セル = rows[0] の G列） ---
        const rawOnAirValue = getVal(rows[0], colIndex(7));
        const normalizedVal = String(rawOnAirValue).trim().toLowerCase();
        const isOnAir = ["1", "true", "on"].includes(normalizedVal);

        // --- 2. お題データの抽出（スプレッドシート2行目以降 = rows[0]から順に処理） ---
        const topics = [];

        for (let i = 0; i < rows.length; i++) {
            const rowObj = rows[i];
            if (!rowObj) continue;

            const id = getVal(rowObj, colIndex(1)) || getVal(rowObj, colIndex(2)) || (i + 1); // A列 or B列: No.
            const topicText = String(getVal(rowObj, colIndex(2))).trim(); // B列: お題
            const isCandidate = String(getVal(rowObj, colIndex(3))).trim() === "1"; // C列: 表示
            const isTalking = String(getVal(rowObj, colIndex(4))).trim() === "1";   // D列: トーク中
            const isCovered = String(getVal(rowObj, colIndex(5))).trim() === "1";   // E列: トーク済み

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