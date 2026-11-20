# Bookmark Organizer (बुकमार्क ऑर्गनाइज़र)

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **हिन्दी** · [العربية](README.ar.md)

अपने ब्राउज़र के बुकमार्क खुद व्यवस्थित करें, या यह काम किसी AI से करवाएँ।

इस प्रोजेक्ट के तीन हिस्से हैं:

- **[वेब टूल](https://dpfcarlos.github.io/bookmark-organizer/)**: एक पेज जो आपके ब्राउज़र में ही चलता है। एक्सपोर्ट किए गए बुकमार्क लोड करें, डुप्लिकेट और खाली फ़ोल्डर हटाएँ, लिंक को साइट के अनुसार समूहित करें, क्रम से लगाएँ, खिसकाएँ, नाम बदलें, हटाएँ और साफ़ फ़ाइल डाउनलोड करें। कुछ भी अपलोड नहीं होता।
- **MCP सर्वर**: AI को आपके कंप्यूटर पर Chrome, Edge, Brave, Vivaldi, Opera और Chromium के बुकमार्क सीधे पढ़ने और बदलने देता है: सूची बनाना, खोजना, डुप्लिकेट और टूटे लिंक ढूँढना, फ़ोल्डरों में व्यवस्थित करना, एक्सपोर्ट करना, सब हटाकर नया सेट लोड करना और बैकअप बहाल करना।
- **Skill** (`organize-bookmarks`): AI को सुरक्षित तरीका सिखाता है: पहले बैकअप, फिर जाँच कि ब्राउज़र बंद है, फिर पूर्वावलोकन, और आपकी पुष्टि के बाद ही बदलाव।

## 1. वेब टूल (कुछ इंस्टॉल नहीं करना)

**https://dpfcarlos.github.io/bookmark-organizer/** खोलें (या [`docs/index.html`](docs/index.html) डाउनलोड करके खोलें)।

1. अपने बुकमार्क **एक्सपोर्ट** करें: Chrome, Edge या Brave में `Ctrl+Shift+O` दबाएँ, ⋮ मेन्यू खोलें और *बुकमार्क एक्सपोर्ट करें* चुनें। Firefox में: `Ctrl+Shift+O` → *Import and Backup* → *Export Bookmarks to HTML*।
2. पेज में फ़ाइल को **व्यवस्थित** करें। एक साथ कई फ़ाइलें लोड की जा सकती हैं, वे आपस में जुड़ जाती हैं।
3. **साफ़ फ़ाइल लोड करें**: ब्राउज़र में पुराने बुकमार्क हटाएँ (बुकमार्क मैनेजर में `Ctrl+A` फिर `Delete`) और डाउनलोड की गई फ़ाइल के साथ *बुकमार्क इम्पोर्ट करें* का उपयोग करें।

मूल एक्सपोर्ट फ़ाइल संभालकर रखें: यही आपका बैकअप है।

## 2. काम AI से करवाएँ (MCP सर्वर + skill)

ज़रूरत: [Node.js](https://nodejs.org) 18 या नया। सर्वर **आपके कंप्यूटर पर** चलता है, क्योंकि बुकमार्क वहीं हैं; इसलिए यह डेस्कटॉप ऐप (Claude Desktop, Claude Code, Cursor, VS Code आदि) के साथ काम करता है, केवल क्लाउड में चलने वाले चैट के साथ नहीं।

### Claude Code (प्लगइन: MCP सर्वर और skill एक ही कदम में)

```
/plugin marketplace add dpfcarlos/bookmark-organizer
/plugin install bookmark-organizer@bookmark-organizer
```

केवल MCP सर्वर:

```bash
claude mcp add bookmark-organizer -- npx -y github:dpfcarlos/bookmark-organizer
```

### Claude Desktop

*Settings → Developer → Edit Config* खोलें और `claude_desktop_config.json` में जोड़ें:

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

Claude Desktop को फिर से शुरू करें। skill जोड़ने के लिए [`skills/organize-bookmarks`](skills/organize-bookmarks) फ़ोल्डर को .zip के रूप में डाउनलोड करें और *Settings → Capabilities → Skills* में अपलोड करें।

### Cursor, VS Code, Windsurf और अन्य MCP क्लाइंट

प्रोग्राम की MCP सेटिंग में यही कमांड इस्तेमाल करें: `npx -y github:dpfcarlos/bookmark-organizer` (stdio)।

### अनुरोध के उदाहरण

- "मेरे Chrome के बुकमार्क को विषय के अनुसार फ़ोल्डरों में व्यवस्थित करो।"
- "Edge में डुप्लिकेट बुकमार्क और खाली फ़ोल्डर हटाओ।"
- "टूटे लिंक वाले बुकमार्क ढूँढो।"
- "मेरे बुकमार्क एक्सपोर्ट करो, सब हटाओ और यह साफ़ फ़ाइल लोड करो: C:\Users\me\Downloads\bookmarks-organized.html"
- "आख़िरी बदलाव वापस लो।"

## सुरक्षा

- **डिफ़ॉल्ट रूप से ड्राई रन।** बदलाव करने वाले टूल तब तक सिर्फ़ दिखाते हैं कि क्या होगा, जब तक उन्हें `dry_run: false` के साथ न चलाया जाए।
- हर बदलाव से पहले `~/.bookmark-organizer/backups` में **स्वचालित बैकअप**। `restore_backup` किसी भी बदलाव को वापस ले लेता है।
- **ब्राउज़र खुला हो तो कुछ नहीं लिखता**, क्योंकि बंद होते समय ब्राउज़र फ़ाइल को फिर से लिख देगा।
- **सिंक:** अगर चालू है, तो हटाए गए आइटम सर्वर से वापस आ सकते हैं। बड़ी सफ़ाई के लिए *एक्सपोर्ट → व्यवस्थित → ब्राउज़र में सब हटाएँ → साफ़ फ़ाइल इम्पोर्ट* बेहतर है।
- Firefox और Safari सीधे नहीं बदले जाते: उनके HTML एक्सपोर्ट को वेब टूल या `import_html` के साथ इस्तेमाल करें।

MCP टूल की पूरी सूची [अंग्रेज़ी README](README.md#mcp-tools) में है।

---

MIT लाइसेंस। योगदान का स्वागत है।
