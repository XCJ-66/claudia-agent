export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { gameData, plays, teamName, opponentName, gameDate } = req.body;

  try {
    // Build CSV data for the report (Excel-compatible)
    const rows = [];

    // ── GAME SUMMARY ──
    rows.push(["HONUS GAME REPORT"]);
    rows.push([`Date: ${gameDate || new Date().toLocaleDateString()}`]);
    rows.push([`${teamName || "Home Team"} vs ${opponentName || "Away Team"}`]);
    rows.push([`Final Score: ${gameData?.homeTeam?.name || "Home"} ${gameData?.homeTeam?.runs || 0} - ${gameData?.awayTeam?.name || "Away"} ${gameData?.awayTeam?.runs || 0}`]);
    rows.push([]);

    // ── INNING BY INNING ──
    rows.push(["INNING BY INNING SCORING"]);
    const maxInnings = Math.max(
      (gameData?.homeTeam?.innings || []).length,
      (gameData?.awayTeam?.innings || []).length,
      6
    );
    const inningHeaders = ["TEAM"];
    for (let i = 1; i <= maxInnings; i++) inningHeaders.push(`INN ${i}`);
    inningHeaders.push("R", "H", "E");
    rows.push(inningHeaders);

    [gameData?.awayTeam, gameData?.homeTeam].forEach(team => {
      if (!team) return;
      const row = [team.name || "Team"];
      for (let i = 0; i < maxInnings; i++) {
        row.push(team.innings?.[i] ?? "-");
      }
      row.push(team.runs || 0, team.hits || 0, team.errors || 0);
      rows.push(row);
    });
    rows.push([]);

    // ── BATTING STATS ──
    rows.push(["BATTING STATISTICS"]);
    rows.push(["PLAYER", "AB", "H", "2B", "3B", "HR", "RBI", "BB", "K", "AVG", "OBP"]);

    // Parse batting stats from plays
    const battingStats = {};
    if (plays && plays.length > 0) {
      plays.forEach(play => {
        const desc = play.description || "";
        const playerMatch = desc.match(/^([A-Z]\.\s\w+|\w+\s\w+)/);
        if (!playerMatch) return;
        const player = playerMatch[1];
        if (!battingStats[player]) {
          battingStats[player] = { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0 };
        }
        const d = desc.toLowerCase();
        if (d.includes("home run") || d.includes("homers")) { battingStats[player].ab++; battingStats[player].h++; battingStats[player].hr++; }
        else if (d.includes("triple")) { battingStats[player].ab++; battingStats[player].h++; battingStats[player].triples++; }
        else if (d.includes("double")) { battingStats[player].ab++; battingStats[player].h++; battingStats[player].doubles++; }
        else if (d.includes("single") || d.includes("singles")) { battingStats[player].ab++; battingStats[player].h++; }
        else if (d.includes("walk") || d.includes("walks")) { battingStats[player].bb++; }
        else if (d.includes("struck out") || d.includes("strikeout")) { battingStats[player].ab++; battingStats[player].k++; }
        else if (d.includes("grounds out") || d.includes("flies out") || d.includes("pops out") || d.includes("out")) { battingStats[player].ab++; }
        if (d.includes("rbi") || d.includes("scores") || d.includes("score")) {
          const rbiMatch = desc.match(/(\d+)\s*rbi/i);
          battingStats[player].rbi += rbiMatch ? parseInt(rbiMatch[1]) : 1;
        }
      });
    }

    // Add sample players if no play data
    if (Object.keys(battingStats).length === 0) {
      battingStats["Player 1"] = { ab: 3, h: 1, doubles: 0, triples: 0, hr: 0, rbi: 1, bb: 1, k: 1 };
      battingStats["Player 2"] = { ab: 4, h: 2, doubles: 1, triples: 0, hr: 0, rbi: 2, bb: 0, k: 0 };
    }

    Object.entries(battingStats).forEach(([player, s]) => {
      const avg = s.ab > 0 ? (s.h / s.ab).toFixed(3) : ".000";
      const obp = (s.ab + s.bb) > 0 ? ((s.h + s.bb) / (s.ab + s.bb)).toFixed(3) : ".000";
      rows.push([player, s.ab, s.h, s.doubles, s.triples, s.hr, s.rbi, s.bb, s.k, avg, obp]);
    });

    // Totals row
    const totals = Object.values(battingStats).reduce((acc, s) => ({
      ab: acc.ab + s.ab, h: acc.h + s.h, doubles: acc.doubles + s.doubles,
      triples: acc.triples + s.triples, hr: acc.hr + s.hr, rbi: acc.rbi + s.rbi,
      bb: acc.bb + s.bb, k: acc.k + s.k
    }), { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0 });
    const teamAvg = totals.ab > 0 ? (totals.h / totals.ab).toFixed(3) : ".000";
    rows.push(["TEAM TOTALS", totals.ab, totals.h, totals.doubles, totals.triples, totals.hr, totals.rbi, totals.bb, totals.k, teamAvg, "-"]);
    rows.push([]);

    // ── PITCHING STATS ──
    rows.push(["PITCHING STATISTICS"]);
    rows.push(["PITCHER", "IP", "H", "R", "ER", "BB", "K", "ERA"]);
    rows.push(["TBD - Update after game", "-", "-", "-", "-", "-", "-", "-"]);
    rows.push([]);

    // ── FIELDING STATS ──
    rows.push(["FIELDING STATISTICS"]);
    rows.push(["PLAYER", "POSITION", "PO", "A", "E", "FLD%"]);
    rows.push(["TBD - Update after game", "-", "-", "-", "-", "-"]);
    rows.push([]);

    // ── PLAY BY PLAY ──
    rows.push(["PLAY BY PLAY"]);
    rows.push(["TIME", "DESCRIPTION"]);
    if (plays && plays.length > 0) {
      plays.forEach(play => {
        rows.push([play.time || "", play.description || ""]);
      });
    } else {
      rows.push(["", "No play data captured"]);
    }

    // Convert to CSV
    const csv = rows.map(row =>
      row.map(cell => {
        const str = String(cell);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    ).join("\n");

    // Return as downloadable CSV (Excel compatible)
    const filename = `Honus_Game_Report_${(gameDate || new Date().toLocaleDateString()).replace(/\//g, "-")}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
