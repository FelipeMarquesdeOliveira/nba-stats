
async function testJersey(teamId: string) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const lastGame = data.events[data.events.length - 1];
        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${lastGame.id}`;
        const sumRes = await fetch(summaryUrl);
        const sumData = await sumRes.json();
        const teamGroup = sumData.boxscore.players.find(tg => tg.team.id === teamId);
        const athlete = teamGroup.statistics[0].athletes[0];
        console.log('Athlete Keys:', Object.keys(athlete.athlete));
        console.log('Jersey:', athlete.athlete.jersey);
    } catch (e) { console.error(e); }
}
testJersey('20');
