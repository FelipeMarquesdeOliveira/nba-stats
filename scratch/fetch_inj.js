const gameId = '401871159'; // Philadelphia vs New York
const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;

async function fetchSummary() {
  const res = await fetch(url);
  const data = await res.json();
  
  const player = data.boxscore.players[0].statistics[0].athletes[0];
  console.log("Player object from ESPN Summary Boxscore:", JSON.stringify(player.athlete, null, 2));
}

fetchSummary();
