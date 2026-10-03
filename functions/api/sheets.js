<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Space Talk Topics</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    #off-air {
      font-size: 2rem;
      font-weight: bold;
      color: #94a3b8;
    }
    #canvas {
      width: 100vw;
      height: 100vh;
      position: absolute;
      top: 0;
      left: 0;
    }
    .node circle {
      stroke: rgba(255, 255, 255, 0.4);
      stroke-width: 2px;
      transition: opacity 0.8s ease, filter 0.5s ease;
    }
    .node.talking circle {
      stroke: #fbbf24;
      stroke-width: 6px;
      filter: drop-shadow(0px 0px 24px #fbbf24);
    }
    .node text {
      font-size: 18px; /* 文字サイズを大きめに（標準18px） */
      font-weight: 700;
      fill: #ffffff;
      text-anchor: middle;
      pointer-events: none;
      user-select: none;
    }
    .node.talking text {
      font-size: 20px; /* トーク中は文字も少し大きく */
    }
    .node text tspan {
      dominant-baseline: middle;
    }
  </style>
</head>
<body>

  <div id="off-air">番組準備中... (ON-AIR Off)</div>
  <svg id="canvas"></svg>

  <script>
    const width = window.innerWidth;
    const height = window.innerHeight;
    const colors = ["#f43f5e", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

    let nodes = [];
    let simulation;

    const svg = d3.select("#canvas")
      .attr("width", width)
      .attr("height", height);

    // D3 物理シミュレーション初期化
    simulation = d3.forceSimulation(nodes)
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("charge", d3.forceManyBody().strength(-40))
      .force("collide", d3.forceCollide().radius(d => d.r + 8).iterations(3))
      .on("tick", ticked);

    function ticked() {
      svg.selectAll(".node")
        .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    // 文字列を複数行の配列に分解する関数
    function splitTextToLines(text, maxCharsPerLine = 8) {
      if (!text) return [];
      
      // スラッシュやスペースなどの区切り文字で分割
      const chunks = text.split(/(?<=[\/\s ])|(?<=ー)/);
      const lines = [];
      let currentLine = "";

      chunks.forEach(chunk => {
        if ((currentLine + chunk).length > maxCharsPerLine && currentLine !== "") {
          lines.push(currentLine);
          currentLine = chunk;
        } else {
          currentLine += chunk;
        }
      });
      if (currentLine) lines.push(currentLine);

      // それでも長い単語がある場合は強制的に文字数制限で切る
      const finalLines = [];
      lines.forEach(line => {
        while (line.length > maxCharsPerLine) {
          finalLines.push(line.substring(0, maxCharsPerLine));
          line = line.substring(maxCharsPerLine);
        }
        if (line) finalLines.push(line);
      });

      return finalLines;
    }

    // SVGテキストに折り返しtspanを描画する関数
    function renderWrappedText(selection) {
      selection.each(function(d) {
        const el = d3.select(this);
        el.selectAll("tspan").remove(); // 再描画時に初期化

        const lines = splitTextToLines(d.text, 8); // 1行あたり最大8文字程度で改行
        const lineHeight = 22; // 行間(px)
        const totalHeight = (lines.length - 1) * lineHeight;

        lines.forEach((line, i) => {
          const yOffset = (i * lineHeight) - (totalHeight / 2);
          el.append("tspan")
            .attr("x", 0)
            .attr("y", yOffset)
            .text(line);
        });
      });
    }

    // データの更新・描画処理
    function updateVisualization(topics) {
      // お題の数に応じて丸の半径(r)を動的に変化（文字を大きく見せるため最小半径を65pxに拡大）
      const count = topics.length || 1;
      const radius = Math.max(65, Math.min(110, 350 / Math.sqrt(count)));

      // 既存ノードとの突合・更新
      const newNodes = topics.map(t => {
        const existing = nodes.find(n => n.id === t.id);
        return {
          id: t.id,
          text: t.text,
          isTalking: t.isTalking,
          r: radius,
          color: existing ? existing.color : colors[Math.floor(Math.random() * colors.length)],
          x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 100,
          y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 100
        };
      });

      nodes = newNodes;

      // 物理シミュレーションの対象を更新
      simulation.nodes(nodes);
      
      // トーク中(isTalking)の丸は中央へ強力に惹きつける
      simulation.force("x", d3.forceX(width / 2).strength(d => d.isTalking ? 0.35 : 0.01));
      simulation.force("y", d3.forceY(height / 2).strength(d => d.isTalking ? 0.35 : 0.01));
      simulation.force("collide", d3.forceCollide().radius(d => d.r + 10));
      simulation.alpha(0.3).restart();

      // D3 データバインド
      const nodeSelection = svg.selectAll(".node")
        .data(nodes, d => d.id);

      // 削除（消化済などで消えたお題）
      nodeSelection.exit()
        .transition().duration(800)
        .style("opacity", 0)
        .remove();

      // 新規追加
      const enter = nodeSelection.enter().append("g")
        .attr("class", d => `node ${d.isTalking ? 'talking' : ''}`)
        .style("opacity", 0);

      enter.append("circle")
        .attr("r", d => d.r)
        .attr("fill", d => d.color);

      const textElem = enter.append("text");
      renderWrappedText(textElem);

      enter.transition().duration(500).style("opacity", 1);

      // 更新
      const merged = enter.merge(nodeSelection);
      merged.attr("class", d => `node ${d.isTalking ? 'talking' : ''}`);
      merged.select("circle")
        .transition().duration(300)
        .attr("r", d => d.r);

      // テキストの更新と再折り返し
      merged.select("text").call(renderWrappedText);
    }

    // 3秒おきにCloudflare FunctionsのAPIをポーリング
    async function fetchData() {
      try {
        const res = await fetch("/api/sheets");
        const data = await res.json();

        if (!data.isOnAir) {
          document.getElementById("off-air").style.display = "block";
          document.getElementById("canvas").style.display = "none";
        } else {
          document.getElementById("off-air").style.display = "none";
          document.getElementById("canvas").style.display = "block";
          updateVisualization(data.topics);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }
    }

    setInterval(fetchData, 3000);
    fetchData();
  </script>
</body>
</html>