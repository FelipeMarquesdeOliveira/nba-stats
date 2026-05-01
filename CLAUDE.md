# NBA Stats - Configuração do Projeto

## Visão Geral
Aplicação web para monitoramento de dados da NBA em tempo real, incluindo jogos ao vivo, lesões, estatísticas e linhas de apostas.

**Tecnologias:** Node.js, React, TypeScript
**Data de Início:** 2026-04-30
**Orçamento:** Zero (fontes gratuitas e públicas)

---

## Arquitetura do Projeto

```
nba-stats/
├── src/
│   ├── backend/          # API e lógica de servidor
│   ├── frontend/         # Interface React
│   └── data-collection/  # Camada de scraping e adapters
├── tests/
│   ├── unit/            # Testes unitários
│   ├── integration/    # Testes de integração
│   └── e2e/            # Testes end-to-end
├── scripts/            # Scripts utilitários
├── docs/               # Documentação
├── logs/               # Arquivos de log
└── cache/              # Cache de requisições
```

### Separação de Responsabilidades

| Camada | Responsabilidade |
|--------|-----------------|
| `frontend/` | Interface do usuário, estado da aplicação |
| `backend/` | API, validação, lógica de negócio |
| `data-collection/` | Scraping, consumo de APIs públicas, adapters |

---

## Convenções de Nomenclatura

### Arquivos
- **Componentes React:** `PascalCase.tsx`
- **Hooks:** `useNome.ts`
- **Serviços/Utils:** `camelCase.ts`
- **Tipos/Interfaces:** `camelCase.types.ts`
- **Configurações:** `kebab-case.config.ts`

### Variáveis e Funções
- `camelCase` para variáveis e funções
- `UPPER_SNAKE_CASE` para constantes
- Prefixos: `is`, `has`, `should` para booleanos

### Pastas
- Plural para collections: `controllers/`, `models/`, `services/`
- Nomes descritivos: `player-stats/`, `game-live/`

---

## Estratégia de Providers/Adapters

### Estrutura de Providers
Cada fonte de dados terá seu próprio adapter:

```
src/data-collection/providers/
├── nba-com/           # stats.nba.com
├── espn/              # ESPN NBA
├── sports-reference/   # Basketball Reference
└── betting-odds/      # Linhas de apostas (validação necessária)
```

### Interface Gateway (Neutro, Sem Acoplamento)
```typescript
interface GameGateway {
  getGamesForDate(date: string): Promise<Game[]>;
  getGameById(gameId: string): Promise<Game | null>;
}

interface LiveGameGateway {
  getLiveGameData(gameId: string): Promise<LiveGameData | null>;
  subscribeToLiveGame(gameId: string): Promise<LiveGameData>;
}

interface InjuryGateway {
  getInjuriesByGame(gameId: string): Promise<{ homeTeam, awayTeam }>;
  getInjuriesByTeam(teamId: string): Promise<AvailabilityItem[]>;
}

interface OddsGateway {
  getPlayerPointsLine(playerId: string, gameId: string): Promise<PlayerPointsLine | null>;
  getTeamPointsLine(teamId: string, gameId: string): Promise<TeamPointsLine | null>;
}

interface BoxScoreGateway {
  getBoxScore(gameId: string): Promise<BoxScore | null>;
}

interface PregameGateway {
  getPregameData(gameId: string): Promise<PregameData | null>;
}
```

### Mocks Centralizados
Mocks em `src/frontend/mocks/`:
- `teams.ts` - Times mockados
- `players.ts` - Jogadores mockados
- `games.ts` - Jogos mockados
- `live-game-data.ts` - Dados de jogo ao vivo
- `pregame-data.ts` - Dados pré-jogo
- `boxscore-data.ts` - Boxscores finais

### Interface Base de Provider
```typescript
interface DataProvider {
  name: string;
  baseUrl: string;
  rateLimit: number; // ms entre requisições
  fetch<T>(endpoint: string): Promise<T>;
  transform<T>(raw: unknown): T;
}
```

---

## Tratamento de Erros

### Níveis de Erro
1. **Transient:** Retry automático (timeout, 429, 5xx)
2. **Permanent:** Log e notificação, sem retry (401, 403, 404)
3. **Fatal:** Parar execução e escalar (credenciais inválidas, rate limit permanente)

### Estratégia de Retry
- Máximo 3 tentativas
- Backoff exponencial: 1s, 2s, 4s
- Jitter: ±500ms aleatório
- Retry apenas para erros transient

### Logging
- Níveis: `debug`, `info`, `warn`, `error`
- Formato: `[TIMESTAMP] [LEVEL] [SOURCE] message`
- Destino: `logs/app.log` + console em dev
- Retenção: 7 dias localmente

---

## Rate Limiting

### Por Fonte (Hipóteses Conservadoras - Validar)
| Fonte | Limite Inicial |
|-------|---------------|
| stats.nba.com | 30 req/min (conservador) |
| ESPN | 30 req/min (conservador) |
| Sports Reference | 15 req/min (conservador) |
| betting-odds | A definir (free tier limitado) |

### Implementação
- Token bucket algorithm
- Fila de requests com delay configurável
- Circuit breaker após 5 falhas consecutivas

---

## Cache

### Estratégia
- **TTL por tipo de dado:**
  - Jogos ao vivo: 10 segundos
  - Estatísticas: 5 minutos
  - Lesões: 1 minuto
  - Linhas de aposta: 30 segundos

### Armazenamento
- Cache em memória para dados frequentes
- Persistência em disco para dados históricos

---

## Timestamp e Rastreabilidade

### Cada dado coletado terá metadata:
```typescript
interface DataMetadata {
  source: string;        // Provider de origem
  collectedAt: number;   // Unix timestamp ms
  url: string;           // URL de origem
  cacheHit: boolean;     // Se veio do cache
}
```

---

## Fluxo Padrão por Tarefa

1. **Pesquisa** - Entender o problema e alternativas
2. **Plano** - Definir fases e abordagem
3. **Aprovação** - Apresentar plano e aguardar confirmação
4. **Implementação** - Desenvolver código
5. **Review** - Revisar código com skills disponíveis
6. **Testes** - Executar testes unitários/integração
7. **Validação local** - Rodar projeto localmente
8. **Aprovação para commit** - Aguardar permissão do usuário

---

## Critérios de Aceite

- [ ] Código compila sem erros
- [ ] Testes unitários passam
- [ ] Testes de integração passam (quando aplicável)
- [ ] Projeto roda localmente
- [ ] Não há segredos ou credenciais no código
- [ ] Código segue convenções de nomenclatura
- [ ] Logging adequado implementado
- [ ] Tratamento de erros implementado

---

## Regras de Frontend

### Estrutura
- Componentes em `src/frontend/components/`
- Hooks customizados em `src/frontend/hooks/`
- Páginas em `src/frontend/pages/`
- Serviços de API em `src/frontend/services/`
- Tipos em `src/frontend/types/`

### Padrões
- Componentes funcionais com hooks
- TypeScript estrito
- CSS modules ou styled-components (definir preferência)
- Responsividade obrigatória
- Acessibilidade (WCAG 2.1 AA)

### Não fazer
- Sem `any` sem justificativa
- Sem `console.log` em produção
- Sem estados duplicados (React state vs Zustand/Redux)

---

## Regras de Confiabilidade e Rastreabilidade

### Fonte de Dados
- Toda fonte deve ter documentação verificada
- Toda fonte deve ser testada antes de usar em produção
- Fontes gratuitas devem funcionar sem API key ou com key free

### Rastreabilidade
- Cada provider deve implementar `DataMetadata`
- Logs devem incluir source e timestamp
- Erros devem indicar fonte de origem

### Fallback
- Se fonte primária falha, tentar fonte secundária
- Se todas falham, retornar dados do cache com aviso
- Nunca retornar dados sem indicar que estão desatualizados

### Odds/Player Props
- **Atenção:** Fontes de odds têm free tier limitado ou pagante
- Validar limites antes de implementar polling frequente
- Considerar caching agressivo para dados de apostas
- Alternativas: The Odds API, API-Football, OddsMonkey

---

## Regras Operacionais

### Antes de Implementar
1. Pesquisar alternativas existentes
2. Planejar fases de implementação
3. Apresentar plano para aprovação
4. Obter confirmação antes de codar

### Após Implementar
1. Review do código
2. Rodar testes
3. Testar localmente
4. Aguardar aprovação para commit

### Antes de Commits
1. Revisar mudanças
2. Verificar testes passando
3. Confirmar com usuário antes de commitar
4. Commits devem ser feitos em nome do usuário, não "Claude"

### Antes de Push
1. Obter aprovação explícita
2. Verificar branch de destino
3. Confirmar que não há segredos no commit

---

## Fontes de Dados (Hipóteses - Validar)

| Fonte | Tipo | Confiabilidade | Custo | Status |
|-------|------|----------------|-------|--------|
| stats.nba.com | API oficial | Alta | Gratuito | ⏳ Validar |
| ESPN API | API pública | Média-Alta | Gratuito | ⏳ Validar |
| Sports Reference | Scraping | Alta | Gratuito | ⏳ Validar |
| The Odds API | API | Média | Freemium | ⚠️ Limite free tier - validar |
| betting-odds (alternativas) | API | Média | Freemium | ⏳ Pesquisar melhores opções |

**Nota:** Todas as fontes devem ser validadas antes de uso. Odds API tem limitações no free tier.

---

## Skills Instaladas (Ativas)

### `.claude/skills/typescript-skill/`
Referências de TypeScript advanced patterns, generics, enterprise patterns.

### `.claude/skills/code-review-skill/`
Checklists e guias de code review para múltiplas linguagens.

### `.claude/skills/playwright-skill-new/`
Framework E2E testing com Playwright.

### `.claude/skills/deep-review-skill/`
Análise profunda de código, security review, performance analysis.

### `.claude/skills/mastering-typescript-skill/`
Mastery de TypeScript para projetos enterprise.

### Referências (não ativas)
- `.claude/skills/frontend-design/` - Claude-Code-Frontend-Design-Toolkit (sem SKILL.md)
- `.claude/skills/mcp-server-reference/` - Template MCP server
- `.claude/skills/fetch-mcp-reference/` - Exemplos fetch API

---

## Contato

Usuário: Felipe Marques
Git: FelipeMarquesdeOliveira