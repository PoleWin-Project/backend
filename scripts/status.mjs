#!/usr/bin/env node
// npm run status — polls /api/v1/health every 2s, refreshes in-place

import http from "http";

const PORT = process.env.PORT ?? 8000;
const URL  = `http://localhost:${PORT}/api/v1/health`;

const RED    = "\x1b[31m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const RESET  = "\x1b[0m";

let prevLines = 0;

function printLines(lines) {
    // Remonter et écraser les lignes précédentes
    if (prevLines > 0) {
        process.stdout.write(`\x1b[${prevLines}A\x1b[J`);
    }
    const output = lines.join("\n") + "\n";
    process.stdout.write(output);
    prevLines = lines.length;
}

function fetch(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 1500, headers: { "Accept-Encoding": "identity" } }, (res) => {
            let body = "";
            res.on("data", (c) => (body += c));
            res.on("end", () => {
                try { resolve(JSON.parse(body)); }
                catch { resolve(null); }
            });
        });
        req.on("error",   reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    });
}

function bar(used, total, width = 20) {
    const pct  = Math.min(used / total, 1);
    const fill = Math.round(pct * width);
    const color = pct > 0.8 ? RED : pct > 0.5 ? YELLOW : GREEN;
    return color + "█".repeat(fill) + DIM + "░".repeat(width - fill) + RESET;
}

function fmtUptime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(" ");
}

async function render() {
    const now = new Date().toLocaleTimeString("fr-FR");
    const lines = [];

    let data;
    try { data = await fetch(URL); }
    catch { data = null; }

    lines.push(`${BOLD}${CYAN}━━━  PoleWin API  ━━━${RESET}  ${DIM}${now}${RESET}`);
    lines.push(`${DIM}${URL}${RESET}`);
    lines.push("");

    if (!data) {
        lines.push(`${RED}${BOLD}● SERVER DOWN${RESET}`);
        lines.push(`${DIM}Aucune réponse sur le port ${PORT}${RESET}`);
        lines.push("");
        lines.push(`${DIM}→ npm run dev${RESET}`);
    } else {
        const { version, uptimeSec, memory } = data;
        const used  = memory?.heapUsedMb  ?? 0;
        const total = memory?.heapTotalMb ?? 1;
        const rss   = memory?.rssMb       ?? 0;

        lines.push(`${GREEN}${BOLD}● UP${RESET}   v${version ?? "?"}   uptime ${CYAN}${fmtUptime(uptimeSec)}${RESET}`);
        lines.push("");
        lines.push(`${BOLD}Heap${RESET}  ${bar(used, total)} ${CYAN}${used}${RESET}/${total} MB`);
        lines.push(`${BOLD}RSS ${RESET}  ${DIM}${rss} MB${RESET}`);
    }

    lines.push("");
    lines.push(`${DIM}Ctrl+C pour quitter${RESET}`);

    printLines(lines);
}

render();
const interval = setInterval(render, 2000);

process.on("SIGINT", () => {
    clearInterval(interval);
    process.exit(0);
});
