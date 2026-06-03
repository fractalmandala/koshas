# Koshas Capture Extension

Sideload this folder in Chrome, Brave, or another Chromium browser with **Extensions -> Load unpacked**.

The extension adds right-click capture actions for pages, selected text, and images. Captures are sent through:

```text
koshas://add?url=<encoded_url>&title=<encoded_title>&selection=<encoded_text>
```

If Koshas is not open, the popup keeps pending protocol URLs in `chrome.storage.local` and exposes a **Launch Koshas** button to send them again.
