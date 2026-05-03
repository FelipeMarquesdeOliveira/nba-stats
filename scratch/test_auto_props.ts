
async function testAutoProps() {
    try {
        // Testando endpoint da Action Network para NBA Props
        // Nota: Esse endpoint é público para o gráfico de props deles
        const url = 'https://api.actionnetwork.com/web/v1/leagues/nba/props/core?bookIds=69,75,68,123,71,32,76,79';
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Props encontradas:", data.props?.length || 0);
        
        // Se encontrar, listar alguns para confirmar
        if (data.props) {
            data.props.slice(0, 5).forEach((p: any) => {
                console.log(`Jogador: ${p.player_name}, Linha: ${p.value}, Tipo: ${p.prop_type}`);
            });
        }
    } catch (e) { console.error("Erro na busca automática:", e); }
}
testAutoProps();
