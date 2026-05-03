
async function debugPositions() {
    const gameId = '401869412'; // Jogo real completado
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        data.boxscore.players.forEach((teamGroup: any) => {
            console.log(`\nTime: ${teamGroup.team.displayName}`);
            teamGroup.statistics[0].athletes.slice(0, 10).forEach((a: any) => {
                console.log(`Jogador: ${a.athlete.displayName} | Posição: ${a.athlete.position?.abbreviation}`);
            });
        });
    } catch (e) { console.error(e); }
}
debugPositions();
