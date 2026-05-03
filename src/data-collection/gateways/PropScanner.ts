
export class PropScanner {
  // Endpoints públicos que costumam ter dados abertos (usando headers de navegador)
  private static SOURCES = [
    'https://sportsbook-us-nj.draftkings.com/sites/US-NJ-SB/api/v5/eventgroups/103?format=json',
    'https://www.bovada.lv/services/sports/event/v1/events/list?marketFilterId=def&liveOnly=false&lang=en&path=/basketball/nba'
  ];

  static async getLiveProps() {
    console.log("Iniciando varredura automática de props...");
    for (const url of this.SOURCES) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Sucesso! Dados recebidos de: ${url}`);
          return data;
        }
      } catch (e) {
        console.warn(`Fonte ${url} falhou, tentando próxima...`);
      }
    }
    return null;
  }
}
