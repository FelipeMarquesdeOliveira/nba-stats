# Convenção de Commits - NBA Stats

## Formato

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[footer opcional]
```

## Tipos

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Apenas documentação |
| `style` | Formatação, lint (sem mudança de código) |
| `refactor` | Refatoração sem mudança de comportamento |
| `perf` | Melhoria de performance |
| `test` | Adição ou correção de testes |
| `chore` | Tarefas de manutenção, deps, scripts |
| `build` | Changes ao sistema de build |
| `ci` | Changes a CI/CD |
| `data` | Mudanças em coletores, providers, scraping |

## Escopos

- `frontend`
- `backend`
- `data-collection`
- `scraping`
- `tests`
- `config`
- `deps`

## Regras

### Antes do Commit
1. Todos os testes devem passar
2. Código deve passar no linter
3. Não commitar segredos ou .env
4. Commits feitos pelo usuário diretamente, não por Claude

### Tamanho de Commit
- Máximo 500 linhas alteradas
- Se maior, dividir em múltiplos commits lógicos
- Commits atômicos: uma mudança = um commit

### Mensagens
- Limite do título: 72 caracteres
- Use imperative mood: "add feature" não "added feature"
- Não use "Co-authored-by" a menos que seja necessário

### O que NÃO commitar
- `node_modules/`
- `.env` e arquivos com segredos
- Arquivos de cache
- Logs
- Builds de produção
- Arquivos binários

## Workflow

1. `git status` - verificar mudanças
2. `git diff` - revisar alterações
3. Fazer commit via terminal do usuário
4. Aguardar aprovação antes de push
