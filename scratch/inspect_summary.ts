
async function inspectGameSummary(gameId: string) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.boxscore && data.boxscore.players) {
            data.boxscore.players.forEach(teamPlayers => {
                console.log(`Team ID: ${teamPlayers.team.id}`);
                const players = teamPlayers.statistics[0].athletes;
                players.slice(0, 5).forEach(p => {
                    console.log(`Player: ${p.athlete.displayName}, ID: ${p.athlete.id}, Starter: ${p.starter}`);
                });
            });
        }
    } catch (e) {
        console.error(e);
    }
}

inspectGameSummary('401705353'); 
