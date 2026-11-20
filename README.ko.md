# Bookmark Organizer (북마크 정리 도구)

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · **한국어** · [हिन्दी](README.hi.md) · [العربية](README.ar.md)

브라우저 북마크를 직접 정리하거나 AI에게 맡겨 정리하세요.

프로젝트는 세 부분으로 이루어져 있습니다.

- **[웹 도구](https://dpfcarlos.github.io/bookmark-organizer/)**: 브라우저에서 실행되는 한 페이지입니다. 내보낸 북마크를 불러와 중복과 빈 폴더를 지우고, 링크를 사이트별로 묶고, 정렬·이동·이름 변경·삭제를 한 뒤 정리된 파일을 내려받습니다. 아무것도 업로드되지 않습니다.
- **MCP 서버**: AI가 내 컴퓨터에서 Chrome, Edge, Brave, Vivaldi, Opera, Chromium 북마크를 직접 읽고 바꿀 수 있게 합니다. 목록 보기, 검색, 중복과 깨진 링크 찾기, 폴더로 재정리, 내보내기, 전체 삭제 후 새 북마크 불러오기, 백업 복원을 지원합니다.
- **Skill** (`organize-bookmarks`): AI에게 안전한 순서를 알려 줍니다. 먼저 백업하고, 브라우저가 닫혀 있는지 확인하고, 미리보기를 보여 준 뒤 사용자가 확인해야만 적용합니다.

## 1. 웹 도구 (설치 불필요)

**https://dpfcarlos.github.io/bookmark-organizer/** 를 엽니다(또는 [`docs/index.html`](docs/index.html)을 내려받아 엽니다).

1. 북마크를 **내보냅니다**. Chrome, Edge, Brave에서는 `Ctrl+Shift+O`를 누르고 ⋮ 메뉴에서 *북마크 내보내기*를 선택합니다. Firefox: `Ctrl+Shift+O` → *가져오기 및 백업* → *HTML로 북마크 내보내기*.
2. 페이지에서 파일을 **정리**합니다. 여러 파일을 한 번에 불러오면 합쳐집니다.
3. **정리된 파일을 불러옵니다**. 브라우저의 기존 북마크를 삭제하고(북마크 관리자에서 `Ctrl+A` → `Delete`) *북마크 가져오기*로 내려받은 파일을 선택합니다.

원래 내보낸 파일은 백업이니 보관하세요.

## 2. AI에게 맡기기 (MCP 서버 + skill)

[Node.js](https://nodejs.org) 18 이상이 필요합니다. 북마크가 내 컴퓨터에 있으므로 서버도 **내 컴퓨터에서** 실행됩니다. 데스크톱 앱(Claude Desktop, Claude Code, Cursor, VS Code 등)에서 사용할 수 있고, 클라우드에서만 실행되는 채팅에서는 사용할 수 없습니다.

### Claude Code (플러그인: MCP 서버와 skill을 한 번에)

```
/plugin marketplace add dpfcarlos/bookmark-organizer
/plugin install bookmark-organizer@bookmark-organizer
```

MCP 서버만 설치:

```bash
claude mcp add bookmark-organizer -- npx -y github:dpfcarlos/bookmark-organizer
```

### Claude Desktop

*Settings → Developer → Edit Config*를 열고 `claude_desktop_config.json`에 다음을 추가합니다:

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

Claude Desktop을 다시 시작합니다. skill을 추가하려면 [`skills/organize-bookmarks`](skills/organize-bookmarks) 폴더를 .zip으로 내려받아 *Settings → Capabilities → Skills*에서 업로드합니다.

### Cursor, VS Code, Windsurf 및 기타 MCP 클라이언트

프로그램의 MCP 설정에서 같은 명령을 사용합니다: `npx -y github:dpfcarlos/bookmark-organizer` (stdio).

### 요청 예시

- "내 Chrome 북마크를 주제별 폴더로 정리해 줘."
- "Edge에서 중복 북마크와 빈 폴더를 지워 줘."
- "링크가 깨진 북마크를 찾아 줘."
- "북마크를 내보내고 모두 삭제한 뒤 이 정리된 파일을 불러와 줘: C:\Users\me\Downloads\bookmarks-organized.html"
- "마지막 변경을 되돌려 줘."

## 안전

- **기본은 시험 실행입니다.** 무언가를 바꾸는 도구는 `dry_run: false`로 호출하기 전까지 결과만 보여 줍니다.
- 변경할 때마다 `~/.bookmark-organizer/backups`에 **자동 백업**합니다. `restore_backup`으로 어떤 변경이든 되돌릴 수 있습니다.
- **브라우저가 열려 있으면 쓰지 않습니다.** 브라우저가 닫히면서 파일을 덮어쓰기 때문입니다.
- **동기화:** 켜져 있으면 삭제한 항목이 서버에서 되살아날 수 있습니다. 대규모 정리에는 *내보내기 → 정리 → 브라우저에서 전체 삭제 → 정리된 파일 가져오기* 순서를 권장합니다.
- Firefox와 Safari는 직접 수정하지 않습니다. HTML 내보내기 파일을 웹 도구나 `import_html`과 함께 사용하세요.

MCP 도구 전체 목록은 [영어 README](README.md#mcp-tools)에 있습니다.

---

MIT 라이선스. 기여를 환영합니다.
