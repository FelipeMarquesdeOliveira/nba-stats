
async function inspectScoreboard() {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
    try {
        const res = await fetch(url);
        const data = await res.json();
        const event = data.events[0];
        if (!event) {
            console.log('No events today.');
            return;
        }
        console.log('Event Name:', event.name);
        const competition = event.competitions[0];
        
        competition.competitors.forEach(c => {
            console.log(`Team: ${c.team.displayName}`);
            // Check for leaders/roster
            if (c.leaders) {
                c.leaders.forEach(l => {
                    console.log(`Leader Name: ${l.name}, Value: ${l.displayName}`);
                });
            }
        });
        
    } catch (e) {
        console.error(e);
    }
}

inspectScoreboard();
