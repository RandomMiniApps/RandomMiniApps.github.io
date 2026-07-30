# Manual QA — phone first

## Browsers

1. iPhone Safari (primary)
2. Android Chrome (primary)
3. Desktop Chrome / Safari (secondary)

## Checklist

- [ ] Welcome screen readable; privacy banner visible
- [ ] Fixture ZIP imports and integrity passes
- [ ] Reviewer identity confirmation shown
- [ ] Pinch-zoom / pan on image step
- [ ] Linked-view chips switch images
- [ ] Single-tap choices auto-advance
- [ ] Quality `none` clears other flags
- [ ] Soft suggestion for router action appears
- [ ] Save draft survives app backgrounding / refresh (resume session)
- [ ] Export progress backup, clear local data, reload the same part, and restore backup
- [ ] Restore the same backup on a second supported device
- [ ] Invalid/different-part backup is rejected without overwriting current progress
- [ ] Jump to next incomplete works
- [ ] Previous/next case navigation works
- [ ] A completed case can be opened and corrected from **Review or correct any case**
- [ ] Progress backup exports
- [ ] Final export blocked until all units complete (use fixture: complete all 3)
- [ ] Final export shares/downloads on phone
- [ ] Clear local data requires typing CLEAR
- [ ] No network requests for package bytes after shell load (DevTools)
- [ ] doctor01–doctor05 each show Part A + Part B, 248 cases each
- [ ] Same password unlocks both parts for one doctor

## Large package smoke (once)

- [ ] Real v3 reviewer package (~40–50 MiB) hashes and opens on a phone
- [ ] Memory remains usable after caching (scroll / next cases)
