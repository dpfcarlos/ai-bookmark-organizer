# Bookmark Organizer (Organisateur de Favoris)

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [हिन्दी](README.hi.md) · [العربية](README.ar.md)

Nettoyez et organisez les favoris de votre navigateur, vous-même ou en demandant à une IA de le faire pour vous.

Le projet comporte trois parties :

- **[Outil web](https://dpfcarlos.github.io/bookmark-organizer/)** : une page qui fonctionne dans votre navigateur. Vous chargez vos favoris exportés, supprimez doublons et dossiers vides, regroupez les liens par site, triez, déplacez, renommez et supprimez, puis téléchargez un fichier propre. Rien n'est envoyé sur internet.
- **Serveur MCP** : permet à l'IA de lire et modifier les favoris de Chrome, Edge, Brave, Vivaldi, Opera et Chromium directement sur votre ordinateur : lister, chercher, trouver doublons et liens morts, réorganiser en dossiers, exporter, tout supprimer et charger un nouvel ensemble, restaurer des sauvegardes.
- **Skill** (`organize-bookmarks`) : apprend à l'IA à procéder en toute sécurité : sauvegarde d'abord, vérification que le navigateur est fermé, aperçu, et application seulement après votre confirmation.

## 1. Outil web (sans installation)

Ouvrez **https://dpfcarlos.github.io/bookmark-organizer/** (ou téléchargez [`docs/index.html`](docs/index.html) et ouvrez-le).

1. **Exportez** vos favoris : dans Chrome, Edge ou Brave, appuyez sur `Ctrl+Maj+O`, ouvrez le menu ⋮ et choisissez *Exporter les favoris*. Dans Firefox : `Ctrl+Maj+O` → *Importation et sauvegarde* → *Exporter des marque-pages au format HTML*.
2. **Organisez** le fichier dans la page. Plusieurs fichiers peuvent être chargés à la fois et sont fusionnés.
3. **Chargez le fichier propre** : supprimez les anciens favoris dans le navigateur (`Ctrl+A` puis `Suppr` dans le gestionnaire de favoris) et utilisez *Importer des favoris* avec le fichier téléchargé.

Conservez l'export original : c'est votre sauvegarde.

## 2. Laissez l'IA le faire (serveur MCP + skill)

Prérequis : [Node.js](https://nodejs.org) 18 ou plus. Le serveur tourne **sur votre ordinateur**, là où sont vos favoris ; il fonctionne donc avec les applications de bureau (Claude Desktop, Claude Code, Cursor, VS Code…), pas avec un chat qui tourne uniquement dans le cloud.

### Claude Code (plugin : serveur MCP et skill en une étape)

```
/plugin marketplace add dpfcarlos/bookmark-organizer
/plugin install bookmark-organizer@bookmark-organizer
```

Uniquement le serveur MCP :

```bash
claude mcp add bookmark-organizer -- npx -y github:dpfcarlos/bookmark-organizer
```

### Claude Desktop

Ouvrez *Settings → Developer → Edit Config* et ajoutez dans `claude_desktop_config.json` :

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

Redémarrez Claude Desktop. Pour ajouter la skill, téléchargez le dossier [`skills/organize-bookmarks`](skills/organize-bookmarks) en .zip et importez-le dans *Settings → Capabilities → Skills*.

### Cursor, VS Code, Windsurf et autres clients MCP

Utilisez la même commande dans les réglages MCP du logiciel : `npx -y github:dpfcarlos/bookmark-organizer` (stdio).

### Exemples de demandes

- « Organise les favoris de mon Chrome en dossiers par thème. »
- « Supprime les favoris en double et les dossiers vides dans Edge. »
- « Trouve les favoris dont le lien est mort. »
- « Exporte mes favoris, supprime-les tous et charge ce fichier propre : C:\Users\moi\Downloads\bookmarks-organized.html »
- « Annule la dernière modification. »

## Sécurité

- **Simulation par défaut.** Les outils qui modifient quelque chose montrent seulement ce qu'ils feraient tant qu'ils ne sont pas appelés avec `dry_run: false`.
- **Sauvegarde automatique** avant chaque modification, dans `~/.bookmark-organizer/backups`. `restore_backup` annule toute modification.
- **Aucune écriture si le navigateur est ouvert**, car il écraserait le fichier en se fermant.
- **Synchronisation :** si elle est activée, le serveur peut faire revenir des éléments supprimés. Pour un grand ménage, préférez *exporter → organiser → tout supprimer dans le navigateur → importer le fichier propre*.
- Firefox et Safari ne sont pas modifiés directement : utilisez leur export HTML avec l'outil web ou `import_html`.

La liste complète des outils MCP se trouve dans le [README en anglais](README.md#mcp-tools).

---

Licence MIT. Les contributions sont les bienvenues.
