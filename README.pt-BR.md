# Bookmark Organizer (Organizador de Favoritos)

[English](README.md) · **Português**

Limpe e organize os favoritos do seu navegador, seja por conta própria ou pedindo para uma IA fazer isso por você.

O projeto tem três partes:

| Parte | Para quem | O que faz |
|---|---|---|
| **[Ferramenta web](https://dpfcarlos.github.io/bookmark-organizer/)** | Qualquer pessoa | Uma página que roda no próprio navegador. Você carrega os favoritos exportados, remove duplicados e pastas vazias, agrupa links por site, ordena, move, renomeia e exclui, e depois baixa um arquivo limpo. Nada é enviado para a internet. |
| **Servidor MCP** | Quem usa Claude Desktop, Claude Code, Cursor, VS Code ou outro cliente MCP | Permite que a IA leia e altere os favoritos do Chrome, Edge, Brave, Vivaldi, Opera e Chromium direto no seu computador: listar, buscar, achar duplicados e links quebrados, reorganizar em pastas, exportar, excluir tudo e carregar um conjunto novo, além de restaurar backups. |
| **Skill** (`organize-bookmarks`) | Os mesmos acima | Ensina a IA a fazer isso com segurança: exportar um backup primeiro, conferir se o navegador está fechado, mostrar uma prévia e só aplicar depois da sua confirmação. |

## 1. Ferramenta web (sem instalar nada)

Abra **https://dpfcarlos.github.io/bookmark-organizer/** (ou baixe o arquivo [`docs/index.html`](docs/index.html) e abra no navegador).

1. **Exporte** seus favoritos: no Chrome, Edge ou Brave aperte `Ctrl+Shift+O`, abra o menu ⋮ e escolha *Exportar favoritos*. No Firefox, use `Ctrl+Shift+O` → *Importar e backup* → *Exportar favoritos para HTML*.
2. **Organize** o arquivo na página. Dá para carregar vários arquivos de uma vez, e eles são unidos.
3. **Carregue o arquivo limpo**: exclua os favoritos antigos no navegador (no gerenciador de favoritos, `Ctrl+A` e depois `Delete`) e use *Importar favoritos* com o arquivo baixado.

Guarde a exportação original, pois ela é o seu backup.

## 2. Deixe a IA fazer o trabalho (servidor MCP + skill)

Requisito: [Node.js](https://nodejs.org) versão 18 ou mais recente. O servidor roda **no seu computador**, porque é lá que estão os favoritos. Por isso ele funciona com aplicativos instalados (Claude Desktop, Claude Code, Cursor, VS Code etc.), e não com um chat que roda somente na nuvem.

### Claude Code (plugin com servidor MCP e skill de uma vez)

```
/plugin marketplace add dpfcarlos/bookmark-organizer
/plugin install bookmark-organizer@bookmark-organizer
```

Somente o servidor MCP:

```bash
claude mcp add bookmark-organizer -- npx -y github:dpfcarlos/bookmark-organizer
```

### Claude Desktop

Abra *Configurações → Desenvolvedor → Editar configuração* e acrescente no arquivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bookmark-organizer": {
      "command": "npx",
      "args": ["-y", "github:dpfcarlos/bookmark-organizer"]
    }
  }
}
```

Reinicie o Claude Desktop. Para adicionar a skill, baixe a pasta [`skills/organize-bookmarks`](skills/organize-bookmarks) em formato .zip e envie em *Configurações → Capacidades → Skills*.

### Cursor, VS Code, Windsurf e outros clientes MCP

Use o mesmo comando nas configurações de MCP do programa: `npx -y github:dpfcarlos/bookmark-organizer` (stdio).

### Exemplos de pedidos

- "Organize os favoritos do meu Chrome em pastas por assunto."
- "Remova os favoritos duplicados e as pastas vazias do Edge."
- "Encontre os favoritos com link quebrado."
- "Exporte meus favoritos, apague todos e carregue este arquivo limpo: C:\Users\eu\Downloads\bookmarks-organized.html"
- "Desfaça a última alteração."

## Ferramentas do MCP

| Ferramenta | O que faz | Altera o navegador? |
|---|---|---|
| `list_profiles` | Navegadores e perfis encontrados, quantidades e se o navegador está aberto | não |
| `stats` | Totais, duplicados, pastas vazias, sites mais salvos e pastas principais | não |
| `get_bookmarks` / `search_bookmarks` | Lista ou busca, com ids e caminho das pastas | não |
| `find_duplicates` | Mesma página salva mais de uma vez (ignora http/https, www, `#` e `utm_*`) | não |
| `check_links` | Encontra links mortos (404, domínio inexistente); sites que bloqueiam robôs aparecem como "incertos" | não |
| `export_html` / `preview_html` | Exporta no formato HTML padrão, que qualquer navegador importa, ou mostra a prévia de um arquivo | não |
| `backup` / `list_backups` / `restore_backup` | Backups e desfazer | só o restore |
| `delete_bookmarks`, `remove_duplicates`, `remove_empty_folders` | Limpeza | sim |
| `create_folder`, `add_bookmark`, `move_bookmarks`, `rename`, `sort_folder` | Reorganização | sim |
| `delete_all_bookmarks` | Esvazia tudo | sim |
| `import_html` | Carrega um arquivo, somando numa pasta ou substituindo tudo | sim |

## Segurança

- **Simulação por padrão.** Toda ferramenta que altera algo apenas mostra o que aconteceria, até ser chamada com `dry_run: false`.
- **Backup automático** antes de cada alteração, na pasta `~/.bookmark-organizer/backups` (dá para mudar com a variável de ambiente `BOOKMARK_ORGANIZER_BACKUPS`). O `restore_backup` desfaz qualquer mudança.
- **Não grava com o navegador aberto**, porque o navegador sobrescreveria o arquivo ao fechar.
- **Sincronização:** se a sincronização de favoritos estiver ligada, o servidor da conta pode trazer de volta itens apagados depois de uma edição direta. Para uma limpeza grande com sincronização ligada, prefira o fluxo *exportar → organizar → apagar tudo no navegador → importar o arquivo limpo*, que a skill explica.
- Firefox e Safari não são editados diretamente. Use a exportação HTML deles com a ferramenta web ou com o `import_html`.

Configurações por variável de ambiente: `BOOKMARKS_FILE` (caminho de um arquivo `Bookmarks` específico) e `BOOKMARK_ORGANIZER_BACKUPS` (pasta de backups).

## Desenvolvimento

```bash
npm install
npm test
```

Os testes criam um perfil falso do Chrome e conversam com o servidor MCP do começo ao fim, do mesmo jeito que um cliente de IA faria.

## Licença

MIT. Contribuições são bem-vindas.
