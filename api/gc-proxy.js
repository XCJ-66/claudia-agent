export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    // Extract team ID and game ID from URL
    // Handles: /teams/TEAMID/season/GAMEID/plays
    const teamMatch = url.match(/teams\/([^/]+)/);
    const gameMatch = url.match(/schedule\/([^/]+)/);

    if (!teamMatch || !gameMatch) {
      return res.status(400).json({ error: "Could not parse GameChanger URL. Make sure you use the /plays URL." });
    }

    const teamId = teamMatch[1];
    const gameId = gameMatch[1];

    // Try GameChanger's API
    const apiUrl = `https://api.sportninja.com/v1/game/${gameId}`;
    const gcApiUrl = `https://api.gc.com/v2.1/games/${gameId}`;

    // Try fetching game data from GameChanger API
    const response = await fetch(gcApiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://web.gc.com",
        "Referer": url,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(parseGCApiData(data));
    }

    // Fallback — fetch the page and look for embedded JSON
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    const html = await pageRes.text();

    // Look for JSON data embedded in the page
    const jsonMatches = [
      html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s),
      html.match(/window\.__STATE__\s*=\s*({.+?});/s),
      html.match(/"game"\s*:\s*({.+?})\s*[,}]/s),
    ];

    for (const match of jsonMatches) {
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          return res.status(200).json(extractGameData(parsed));
        } catch (e) {}
      }
    }

    // Return team and game IDs so frontend knows we found something
    return res.status(200).json({
      status: "In Progress",
      teamId,
      gameId,
      inning: 1,
      isTop: true,
      outs: 0,
      bases: { first: false, second: false, third: false },
      homeTeam: { name: "Home", runs: 0, hits: 0, errors: 0, innings: [] },
      awayTeam: { name: "Away", runs: 0, hits: 0, errors: 0, innings: [] },
      plays: [],
      error: "GameChanger data not accessible. Make sure the game is set to public.",
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function parseGCApiData(data) {
  const game = data?.game || data;
  return {
    status: game?.status || "In Progress",
    inning: game?.period || game?.inning || 1,
    isTop: game?.isTop ?? true,
    outs: game?.outs || 0,
    bases: {
      first: game?.runnersOnBase?.first || false,
      second: game?.runnersOnBase?.second || false,
      third: game?.runnersOnBase?.third || false,
    },
    homeTeam: {
      name: game?.homeTeam?.name || "Home",
      runs: game?.homeTeam?.score || 0,
      hits: game?.homeTeam?.hits || 0,
      errors: game?.homeTeam?.errors || 0,
      innings: game?.homeTeam?.innings || [],
    },
    awayTeam: {
      name: game?.awayTeam?.name || "Away",
      runs: game?.awayTeam?.score || 0,
      hits: game?.awayTeam?.hits || 0,
      errors: game?.awayTeam?.errors || 0,
      innings: game?.awayTeam?.innings || [],
    },
    plays: (game?.plays || []).map((p, i) => ({
      id: i,
      description: p?.description || p?.text || "",
      time: p?.time || "",
    })),
  };
}

function extractGameData(data) {
  const game = data?.game || data?.currentGame || data;
  return parseGCApiData({ game });
}
