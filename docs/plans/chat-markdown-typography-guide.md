# Chat Markdown Typography Guide

> Styling rules for rendering markdown elements inside Olivia chat bubbles. Covers the 6–7 markdown elements the LLM commonly produces. All values use design system tokens from `docs/vision/design-foundations.md`.

---

## Context

- **Olivia bubbles**: `background: var(--surface)`, Fraunces italic 14px, `line-height: 1.55`, `padding: 13px 16px`, `border: 1.5px solid var(--ink-4)`
- **User bubbles**: violet gradient, white text, Plus Jakarta Sans 14px
- Mobile-first — bubbles have `max-width: ~80vw` (roughly 310px on a 390px frame)

Markdown rendering happens **inside** `.msg-bubble`. The bubble's base font (Fraunces italic for Olivia, sans-serif for user) is the starting point; markdown elements override selectively.

---

## Scoping

All markdown styles should be scoped under a `.md-content` wrapper class placed inside `.msg-bubble`. This prevents markdown styles from leaking into non-markdown messages.

```css
.msg-bubble .md-content { /* markdown container */ }
```

---

## 1. Paragraphs

Paragraph spacing within a single message bubble. The first paragraph should have no top margin; the last should have no bottom margin.

```css
.md-content p {
  margin: 0 0 10px 0;
}
.md-content p:last-child {
  margin-bottom: 0;
}
```

**Both bubble types:** Inherit the bubble's font — no override needed.

---

## 2. Headings (h1–h3)

Headings inside chat bubbles should be **smaller and tighter** than page-level headings. They act as section labels within a response, not screen titles.

### Olivia Bubble

Headings stay in Fraunces but shift to **upright (non-italic) weight 700** to contrast with the italic body text. This creates clear hierarchy without leaving the serif family.

```css
.msg-olivia .md-content h1,
.msg-olivia .md-content h2,
.msg-olivia .md-content h3 {
  font-family: 'Fraunces', serif;
  font-style: normal;       /* upright — contrasts with italic body */
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
  margin: 14px 0 6px 0;
}
.msg-olivia .md-content h1 { font-size: 17px; }
.msg-olivia .md-content h2 { font-size: 15px; }
.msg-olivia .md-content h3 { font-size: 14px; }

/* Remove top margin when heading is first child */
.msg-olivia .md-content :first-child:is(h1, h2, h3) {
  margin-top: 0;
}
```

### User Bubble

Headings in user bubbles (rare) use Plus Jakarta Sans bold, white text inherited from bubble.

```css
.msg-user .md-content h1,
.msg-user .md-content h2,
.msg-user .md-content h3 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  line-height: 1.3;
  margin: 14px 0 6px 0;
}
.msg-user .md-content h1 { font-size: 16px; }
.msg-user .md-content h2 { font-size: 15px; }
.msg-user .md-content h3 { font-size: 14px; }

.msg-user .md-content :first-child:is(h1, h2, h3) {
  margin-top: 0;
}
```

**Dark mode:** Automatic — `var(--ink)` resolves correctly. User bubble headings inherit white.

---

## 3. Bold & Italic

### Olivia Bubble

Olivia's baseline is already Fraunces italic 300. This changes the interaction:

- **Bold** (`**text**`): Increase weight to **700** but keep italic. This creates emphasis within the italic flow.
- **Italic** (`*text*`): Already italic — no visual change. That's fine; the LLM rarely uses single-star emphasis in Olivia responses.
- **Bold italic** (`***text***`): Weight 700, italic (same as bold in this context).

```css
.msg-olivia .md-content strong {
  font-weight: 700;
  /* font-style remains italic from parent */
}
.msg-olivia .md-content em {
  /* No change needed — parent is already italic */
}
```

### User Bubble

Standard behavior — bold increases weight, italic adds slant.

```css
.msg-user .md-content strong {
  font-weight: 700;
}
.msg-user .md-content em {
  font-style: italic;
}
```

---

## 4. Ordered & Unordered Lists

Lists need tight spacing inside bubbles. Indentation must be modest given the ~310px max-width.

```css
.md-content ul,
.md-content ol {
  margin: 8px 0;
  padding-left: 20px;         /* tight indent for narrow bubbles */
}
.md-content li {
  margin-bottom: 4px;
  line-height: 1.5;
}
.md-content li:last-child {
  margin-bottom: 0;
}

/* Bullet style */
.md-content ul { list-style-type: disc; }
.md-content ul ul { list-style-type: circle; }

/* Number style */
.md-content ol { list-style-type: decimal; }
```

### Olivia Bubble — Bullet Color

Bullets should use `var(--violet)` to add a touch of brand color. Use `::marker` pseudo-element:

```css
.msg-olivia .md-content ul li::marker {
  color: var(--violet);
}
.msg-olivia .md-content ol li::marker {
  color: var(--violet);
  font-weight: 600;
}
```

### User Bubble — Bullet Color

Bullets inherit white from the parent. No override needed.

**Dark mode:** Automatic — `var(--violet)` is unchanged across modes.

---

## 5. Inline Code

Inline code switches to a monospace font with a subtle background pill. Must be clearly distinct from surrounding prose without being jarring.

```css
.md-content code:not(pre code) {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.85em;          /* relative to parent — ~12px in a 14px bubble */
  font-style: normal;         /* override Olivia's italic baseline */
  font-weight: 400;
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;
}
```

### Olivia Bubble

```css
.msg-olivia .md-content code:not(pre code) {
  background: var(--violet-dim);
  color: var(--violet);
}
```

### User Bubble

```css
.msg-user .md-content code:not(pre code) {
  background: rgba(255, 255, 255, 0.18);
  color: white;
}
```

**Dark mode:** Olivia's `var(--violet-dim)` becomes slightly more opaque (`0.18` vs `0.1`), keeping code legible on the darker surface. User bubble is unchanged (hardcoded on gradient).

---

## 6. Fenced Code Blocks

Code blocks need a contained, scrollable region within the bubble. They should feel like an inset panel.

```css
.md-content pre {
  margin: 10px 0;
  border-radius: 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-height: 240px;          /* scroll after ~15 lines */
  overflow-y: auto;
}
.md-content pre code {
  display: block;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  font-style: normal;         /* override Olivia's italic */
  font-weight: 400;
  line-height: 1.5;
  padding: 12px 14px;
  white-space: pre;
  tab-size: 2;
}
```

### Olivia Bubble

```css
.msg-olivia .md-content pre {
  background: var(--surface-2);
  border: 1px solid var(--ink-4);
}
.msg-olivia .md-content pre code {
  color: var(--ink);
}
```

### User Bubble

```css
.msg-user .md-content pre {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.msg-user .md-content pre code {
  color: white;
}
```

**Dark mode:** Olivia's `var(--surface-2)` shifts to `#242038` — a slightly elevated indigo panel that reads as inset within the `var(--surface)` bubble. User bubble is hardcoded on the gradient, unchanged.

**Scrollbar:** Hide scrollbar on mobile but keep it functional:

```css
.md-content pre::-webkit-scrollbar { display: none; }
.md-content pre { scrollbar-width: none; }
```

---

## 7. Links

Links should be identifiable but not disruptive. Minimum tap target: 44px effective height (handled via line-height, not explicit padding).

```css
.md-content a {
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  transition: color 0.15s ease;
}
```

### Olivia Bubble

```css
.msg-olivia .md-content a {
  color: var(--violet);
  text-decoration-color: var(--violet-dim);
}
.msg-olivia .md-content a:hover,
.msg-olivia .md-content a:active {
  text-decoration-color: var(--violet);
}
```

### User Bubble

```css
.msg-user .md-content a {
  color: white;
  text-decoration-color: rgba(255, 255, 255, 0.4);
}
.msg-user .md-content a:hover,
.msg-user .md-content a:active {
  text-decoration-color: white;
}
```

**Dark mode:** Automatic — `var(--violet)` is unchanged.

---

## Token Summary

| Element | Olivia Bubble Token | User Bubble Token |
|---|---|---|
| Heading font | Fraunces, normal, 700 | Plus Jakarta Sans, 700 |
| Body font | Fraunces, italic, 300 (inherited) | Plus Jakarta Sans, 400 (inherited) |
| Bold weight | 700 | 700 |
| List markers | `var(--violet)` | white (inherited) |
| Inline code bg | `var(--violet-dim)` | `rgba(255,255,255,0.18)` |
| Inline code color | `var(--violet)` | white |
| Code block bg | `var(--surface-2)` | `rgba(0,0,0,0.2)` |
| Code block border | `var(--ink-4)` | `rgba(255,255,255,0.12)` |
| Link color | `var(--violet)` | white |
| Link underline | `var(--violet-dim)` | `rgba(255,255,255,0.4)` |

---

## Dark Mode Notes

All Olivia bubble markdown styling uses CSS custom properties that resolve automatically in dark mode. No explicit dark overrides are needed for markdown elements.

User bubble markdown uses hardcoded `rgba` and `white` values on the violet gradient — these are intentionally mode-independent since the gradient itself is unchanged.

---

## Implementation Notes

- Use a lightweight markdown renderer (e.g., `marked` or `react-markdown`) configured to output only the elements listed above. Disable HTML passthrough for security.
- Wrap rendered output in a `<div class="md-content">` inside `.msg-bubble`.
- For streaming responses, consider a streaming-friendly renderer like `streamdown` that can incrementally render markdown as tokens arrive.
- **Do not** apply markdown rendering to user messages unless the user explicitly writes markdown — it could mangle normal text with underscores or asterisks.
- Keep Fraunces italic as the base Olivia voice even within markdown. Only headings go upright; everything else flows in italic.
