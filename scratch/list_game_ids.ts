
async function listGames() {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
    try {
        const res = await fetch(url);
        const data = await res.json();
        data.events.forEach(e => {
            console.log(`ID: ${e.id}, Name: ${e.name}`);
        });
    } catch (e) {
        console.error(e);
    }
}

listGames();
