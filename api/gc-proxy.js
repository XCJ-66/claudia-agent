export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    // Fetch the GameChanger page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) throw new Error(`GameChanger returned ${response.status}`);

    const html = await response.text();

    // Try to extract JSON data from the page (GameChanger embeds game data in the HTML)
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s) ||
                      html.match(/window\.__STATE__\s*=\s*({.+?});/s) ||
                      html.match(/<script[^>]*type="application\/json"[^>]*>({.+?})<\/script>/s);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        // Try to extract game data from the parsed JSON
        const gameData = extractGameData(parsed);
        return res.status(200).json(gameData);
      } catch (e) {
        // Fall through to HTML parsing
      }
    }

    // Parse HTML to extract visible game data
    const gameData = parseGameHTML(html);
    res.status(200).json(gameData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function extractGameData(data) {
  // Navigate common GameChanger JSON structures
  const game = data?.game || data?.currentGame || data?.gameData || data;
  return {
    status: game?.status || "Unknown",
    inning: game?.inning || game?.currentInning || 1,
    isTop: game?.isTop ?? game?.topOfInning ?? true,
    outs: game?.outs || 0,
    bases: {
      first: game?.runnersOnBase?.first || game?.bases?.first || false,
      second: game?.runnersOnBase?.second || game?.bases?.second || false,
      third: game?.runnersOnBase?.third || game?.bases?.third || false,
    },
    homeTeam: {
      name: game?.homeTeam?.name || "HOME",
      runs: game?.homeTeam?.runs || game?.homeScore || 0,
      hits: game?.homeTeam?.hits || 0,
      errors: game?.homeTeam?.errors || 0,
      innings: game?.homeTeam?.innings || [],
    },
    awayTeam: {
      name: game?.awayTeam?.name || "AWAY",
      runs: game?.awayTeam?.runs || game?.awayScore || 0,
      hits: game?.awayTeam?.hits || 0,
      errors: game?.awayTeam?.errors || 0,
      innings: game?.awayTeam?.innings || [],
    },
    currentBatter: game?.currentBatter?.name || null,
    currentPitcher: game?.currentPitcher?.name || null,
    plays: (game?.plays || game?.playByPlay || []).map((p, i) => ({
      id: i,
      description: p?.description || p?.text || p,
      time: p?.time || p?.timestamp || "",
    })),
  };
}

function parseGameHTML(html) {
  // Extract text content patterns from HTML
  const getText = (pattern) => {
    const match = html.match(pattern);
    return match ? match[1].trim() : null;
  };

  const getNumber = (pattern) => {
    const match = html.match(pattern);
    return match ? parseInt(match[1]) : 0;
  };

  // Try common patterns in GameChanger HTML
  const homeScore = getNumber(/home[^"]*score[^"]*"[^>]*>(\d+)/i) ||
                    getNumber(/"homeScore"\s*:\s*(\d+)/);
  const awayScore = getNumber(/away[^"]*score[^"]*"[^>]*>(\d+)/i) ||
                    getNumber(/"awayScore"\s*:\s*(\d+)/);
  const inning    = getNumber(/"inning"\s*:\s*(\d+)/) || 1;
  const outs      = getNumber(/"outs"\s*:\s*(\d+)/);
  const homeName  = getText(/"homeTeamName"\s*:\s*"([^"]+)"/) || "HOME";
  const awayName  = getText(/"awayTeamName"\s*:\s*"([^"]+)"/) || "AWAY";

  // Extract play by play descriptions
  const playMatches = [...html.matchAll(/"description"\s*:\s*"([^"]+)"/g)];
  const plays = playMatches.slice(0, 20).map((m, i) => ({
    id: i,
    description: m[1],
    time: "",
  }));

  return {
    status: "In Progress",
    inning,
    isTop: true,
    outs,
    bases: { first: false, second: false, third: false },
    homeTeam: { name: homeName, runs: homeScore, hits: 0, errors: 0, innings: [] },
    awayTeam: { name: awayName, runs: awayScore, hits: 0, errors: 0, innings: [] },
    currentBatter: null,
    currentPitcher: null,
    plays,
  };
}
