
async function testDK() {
    try {
        const url = 'https://sportsbook-us-nj.draftkings.com/sites/US-NJ-SB/api/v5/eventgroups/103?format=json';
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        const text = await res.text();
        console.log(text.substring(0, 500));
    } catch (e) { console.error(e); }
}
testDK();
