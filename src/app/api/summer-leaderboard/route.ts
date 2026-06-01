const LEADERBOARD_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQtHQtPNSpSejeRw2ZrNwK6en1tMomKijMj2ZD2UkLtfRQd2mH6c6RzVMaob8j0WESzB8cQkvlFYG-c/pub?gid=1341183540&single=true&output=csv';

type LeaderboardEntry = {
  name: string;
  points: number;
};

function parseLeaderboardCsv(csv: string): LeaderboardEntry[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  const entries: LeaderboardEntry[] = [];

  for (const line of lines) {
    const commaIndex = line.indexOf(',');
    if (commaIndex === -1) continue;

    const name = line.slice(0, commaIndex).trim().replace(/^"|"$/g, '');
    const pointsRaw = line
      .slice(commaIndex + 1)
      .trim()
      .replace(/^"|"$/g, '')
      .replace(',', '.');

    const points = Number.parseFloat(pointsRaw);
    if (!name || Number.isNaN(points)) continue;

    entries.push({ name, points });
  }

  return entries.sort((a, b) => b.points - a.points);
}

export async function GET() {
  try {
    const response = await fetch(LEADERBOARD_CSV_URL, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Не удалось загрузить таблицу лидеров' },
        { status: 502 },
      );
    }

    const csv = await response.text();
    const leaderboard = parseLeaderboardCsv(csv);

    return Response.json({ leaderboard });
  } catch {
    return Response.json(
      { error: 'Не удалось загрузить таблицу лидеров' },
      { status: 500 },
    );
  }
}
