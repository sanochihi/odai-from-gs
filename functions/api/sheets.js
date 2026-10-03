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
        // gviz の rows[].c は table.cols と同じ順（A=0, B=1, …, H=7）
        const COL = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7 };

        const getVal = (rowObj, colIdx) => {
            if (colIdx < 0 || !rowObj || !rowObj.c || !rowObj.c[colIdx]) return "";
            const cell = rowObj.c[colIdx];
            const raw = cell.v != null && cell.v !== "" ? cell.v : cell.f;
            if (raw == null || raw === "") return "";
            return raw;
        };

        /** H列のテキスト（空行判定用） */
        const getHText = (rowObj) => String(getVal(rowObj, COL.H)).trim();

        /** スプレッドシート H5 以降：空行が出るまで行ごとに1行として返す */
        const extractAnnouncementLines = () => {
            const startIndex = 3; // 1行目ヘッダー → rows[0]=2行目 … rows[3]=5行目(H5)
            const lines = [];
            for (let i = startIndex; i < rows.length; i++) {
                const line = getHText(rows[i]);
                if (!line) break;
                lines.push(line);
            }
            return lines;
        };

        // --- 1. ON-AIR フラグの取得（G2セル = rows[0] の G列） ---
        const rawOnAirValue = getVal(rows[0], COL.G);
        const normalizedVal = String(rawOnAirValue).trim().toLowerCase();
        const isOnAir = ["1", "true", "on"].includes(normalizedVal);

        // --- 番組名（H2セル = rows[0] の H列「番組名」） ---
        const programTitle = getHText(rows[0]);

        const announcementLines = extractAnnouncementLines();

        // --- 2. お題データの抽出（スプレッドシート2行目以降 = rows[0]から順に処理） ---
        const topics = [];

        for (let i = 0; i < rows.length; i++) {
            const rowObj = rows[i];
            if (!rowObj) continue;

            const id = getVal(rowObj, COL.A) || (i + 1); // A列: No.
            const topicText = String(getVal(rowObj, COL.B)).trim(); // B列: お題
            const isCandidate = String(getVal(rowObj, COL.C)).trim() === "1"; // C列: 表示
            const isTalking = String(getVal(rowObj, COL.D)).trim() === "1";   // D列: トーク中
            const isCovered = String(getVal(rowObj, COL.E)).trim() === "1";   // E列: トーク済み

            // B列にお題があり、C列=1、かつ E列(トーク済み)≠1 のものを追加
            if (topicText && isCandidate && !isCovered) {
                topics.push({
                    id: id,
                    text: topicText,
                    isTalking: isTalking
                });
            }
        }

        return new Response(JSON.stringify({
            isOnAir,
            rawOnAirValue,
            programTitle,
            announcementLines,
            topics
        }), {
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