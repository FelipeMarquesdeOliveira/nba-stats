
async function testGamelog(athleteId: string) {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/gamelog`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        console.log('Labels:', data.labels);
        if (data.seasonTypes) {
            const season = data.seasonTypes[0];
            const categories = season.categories[0];
            const games = categories.events;
            games.slice(0, 5).forEach(g => {
                console.log(`Stats: ${g.stats.join(', ')}`);
            });
        }

    } catch (e) {
        console.error(e);
    }
}

testGamelog('4278073');
