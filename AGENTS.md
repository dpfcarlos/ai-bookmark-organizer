# AI Bookmark Organizer

Repositorio PUBLICO (pedido expresso do usuario). Ferramenta web + servidor MCP + skill para organizar favoritos do navegador.

## Como executar
- `npm install` e `npm test` (testes criam um perfil falso do Chrome e falam com o servidor MCP por stdio).
- Servidor: `node src/server.js` (stdio). Pagina: abrir `docs/index.html` (sem build).

## Mapa de arquivos
- `src/server.js`: servidor MCP (ferramentas). `src/chromium.js`: leitura/gravacao do arquivo Bookmarks. `src/browsers.js`: acha perfis e detecta navegador aberto. `src/netscape.js`: HTML de favoritos.
- `docs/index.html`: ferramenta web (12 idiomas, objeto `LANGS`). `docs/guides/`: guias estaticos (gerados), `docs/sitemap.xml`, `docs/llms.txt`, `docs/og.png`.
- `skills/organize-bookmarks/SKILL.md`: skill para IAs. `.claude-plugin/`, `.mcp.json`: plugin do Claude Code.
- `server.json`: cadastro no registro oficial do MCP (`mcpName` no `package.json`).
- `README*.md`: um por idioma (en, pt-BR, es, fr, de, it, ru, zh-CN, ja, ko, hi, ar).

## Regras do usuario (nenhuma IA altera sem pedido)
1. Texto formal em portugues, hifen e nunca travessao.
2. Gravar so com dry run confirmado e com backup; nunca gravar com o navegador aberto.
3. Sem estrelas compradas, texto escondido ou comandos dirigidos a IAs na divulgacao.
4. Nunca enviar senhas, tokens ou dados pessoais ao GitHub.
5. Publicar posts em nome do usuario so com aprovacao dele.

## Problemas resolvidos
- Teste no Windows falhava: `node --test test/*.test.js` nao expande curinga no PowerShell. Correcao: `node --test`.
- Rename do repositorio: o endereco do site (GitHub Pages) NAO redireciona; o do repositorio sim. Trocar o nome antes de divulgar.
