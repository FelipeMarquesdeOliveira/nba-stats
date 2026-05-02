
async function inspectGameSummary(gameId: string) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.boxscore && data.boxscore.players) {
            data.boxscore.players.forEach(teamPlayers => {
                console.log(`\nTeam: ${teamPlayers.team.displayName}`);
                const players = teamPlayers.statistics[0].athletes;
                players.forEach(p => {
                    console.log(`Player: ${p.athlete.displayName}, ID: ${p.athlete.id}, Starter: ${p.starter}`);
                });
            });
        } else {
             console.log('Boxscore not available yet.');
        }
    } catch (e) {
        console.error(e);
    }
}

inspectGameSummary('401869412'); 
