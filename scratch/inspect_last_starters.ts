
async function getTeamLastGameStarters(teamId: string) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const completed = data.events?.filter(e => e.competitions[0].status.type.state === 'post') || [];
        const lastGame = completed[completed.length - 1];
        console.log(`Team ${teamId} Last Game: ${lastGame.name} (ID: ${lastGame.id})`);
        
        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${lastGame.id}`;
        const sumRes = await fetch(summaryUrl);
        const sumData = await sumRes.json();
        
        const teamGroup = sumData.boxscore.players.find(tg => tg.team.id === teamId);
        teamGroup.statistics[0].athletes.filter(a => a.starter).forEach(a => {
            console.log(`Player: ${a.athlete.displayName}, ID: ${a.athlete.id}`);
        });
    } catch (e) { console.error(e); }
}

console.log('--- PHI ---');
getTeamLastGameStarters('20');
console.log('\n--- BOS ---');
getTeamLastGameStarters('2');
