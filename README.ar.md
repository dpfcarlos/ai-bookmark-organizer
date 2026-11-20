<div dir="rtl">

# Bookmark Organizer (منظِّم الإشارات المرجعية)

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [हिन्दी](README.hi.md) · **العربية**

نظِّف إشاراتك المرجعية في المتصفح ورتِّبها بنفسك، أو اطلب من الذكاء الاصطناعي أن يقوم بذلك نيابةً عنك.

يتكوّن المشروع من ثلاثة أجزاء:

- **[أداة الويب](https://dpfcarlos.github.io/bookmark-organizer/)**: صفحة تعمل داخل متصفحك. حمِّل الإشارات المرجعية المُصدَّرة، واحذف المكرر والمجلدات الفارغة، وجمِّع الروابط حسب الموقع، ورتِّب وانقل وأعد التسمية واحذف، ثم نزِّل ملفًا نظيفًا. لا يُرفع أي شيء إلى الإنترنت.
- **خادم MCP**: يتيح للذكاء الاصطناعي قراءة الإشارات المرجعية في Chrome وEdge وBrave وVivaldi وOpera وChromium وتعديلها مباشرة على جهازك: العرض، والبحث، وإيجاد المكرر والروابط المعطلة، وإعادة التنظيم في مجلدات، والتصدير، وحذف الكل وتحميل مجموعة جديدة، واستعادة النسخ الاحتياطية.
- **Skill** (`organize-bookmarks`): تعلّم الذكاء الاصطناعي الطريقة الآمنة: نسخة احتياطية أولًا، ثم التأكد من إغلاق المتصفح، ثم عرض معاينة، ولا يُطبَّق أي تغيير إلا بعد موافقتك.

## 1. أداة الويب (بدون تثبيت)

افتح **https://dpfcarlos.github.io/bookmark-organizer/** (أو نزِّل [`docs/index.html`](docs/index.html) وافتحه).

1. **صدِّر** إشاراتك المرجعية: في Chrome أو Edge أو Brave اضغط `Ctrl+Shift+O`، وافتح القائمة ⋮ واختر *تصدير الإشارات المرجعية*. في Firefox: `Ctrl+Shift+O` ← *استيراد ونسخ احتياطي* ← *تصدير العلامات إلى HTML*.
2. **رتِّب** الملف في الصفحة. يمكن تحميل عدة ملفات معًا وسيتم دمجها.
3. **حمِّل الملف النظيف**: احذف الإشارات القديمة في المتصفح (`Ctrl+A` ثم `Delete` في مدير الإشارات المرجعية)، ثم استخدم *استيراد الإشارات المرجعية* مع الملف الذي نزّلته.

احتفظ بملف التصدير الأصلي، فهو نسختك الاحتياطية.

## 2. دع الذكاء الاصطناعي يقوم بالمهمة (خادم MCP + skill)

المتطلبات: [Node.js](https://nodejs.org) الإصدار 18 أو أحدث. يعمل الخادم **على جهازك** لأن إشاراتك المرجعية موجودة هناك، لذلك يعمل مع تطبيقات سطح المكتب (Claude Desktop وClaude Code وCursor وVS Code…) وليس مع محادثة تعمل في السحابة فقط.

</div>

### Claude Code (إضافة: خادم MCP وskill بخطوة واحدة)

```
/plugin marketplace add dpfcarlos/bookmark-organizer
/plugin install bookmark-organizer@bookmark-organizer
```

خادم MCP فقط:

```bash
claude mcp add bookmark-organizer -- npx -y github:dpfcarlos/bookmark-organizer
```

### Claude Desktop

<div dir="rtl">

افتح *Settings → Developer → Edit Config* وأضف إلى `claude_desktop_config.json`:

</div>

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

<div dir="rtl">

أعد تشغيل Claude Desktop. لإضافة الـ skill، نزِّل المجلد [`skills/organize-bookmarks`](skills/organize-bookmarks) بصيغة ‎.zip وارفعه في *Settings → Capabilities → Skills*.

### Cursor وVS Code وWindsurf وعملاء MCP الآخرون

استخدم الأمر نفسه في إعدادات MCP للبرنامج: `npx -y github:dpfcarlos/bookmark-organizer` (stdio).

### أمثلة على الطلبات

- "رتِّب إشاراتي المرجعية في Chrome في مجلدات حسب الموضوع."
- "احذف الإشارات المكررة والمجلدات الفارغة في Edge."
- "ابحث عن الإشارات ذات الروابط المعطلة."
- "صدِّر إشاراتي المرجعية واحذفها كلها ثم حمِّل هذا الملف النظيف: C:\Users\me\Downloads\bookmarks-organized.html"
- "تراجع عن آخر تغيير."

## الأمان

- **التشغيل التجريبي هو الافتراضي.** الأدوات التي تغيّر شيئًا تعرض فقط ما ستفعله إلى أن تُستدعى مع `dry_run: false`.
- **نسخة احتياطية تلقائية** قبل كل تغيير في `~/.bookmark-organizer/backups`. ويمكن لـ `restore_backup` التراجع عن أي تغيير.
- **لا يكتب أي شيء والمتصفح مفتوح**، لأن المتصفح سيكتب فوق الملف عند إغلاقه.
- **المزامنة:** إذا كانت مفعّلة فقد يعيد الخادم العناصر المحذوفة. للتنظيف الكبير يُفضَّل *التصدير ← الترتيب ← حذف الكل في المتصفح ← استيراد الملف النظيف*.
- لا يُعدَّل Firefox وSafari مباشرةً: استخدم ملف تصدير HTML الخاص بهما مع أداة الويب أو `import_html`.

القائمة الكاملة لأدوات MCP موجودة في [ملف README الإنجليزي](README.md#mcp-tools).

---

رخصة MIT. المساهمات مرحَّب بها.

</div>
