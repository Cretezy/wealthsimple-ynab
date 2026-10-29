# Store assets

Chrome Web Store / Firefox Add-ons listing images.

| File                                                      | Use                          |
| --------------------------------------------------------- | ---------------------------- |
| `screenshot-1-connect.png` … `screenshot-4-sync-done.png` | Store screenshots (1280×800) |
| `promo-small-440x280.png`                                 | Chrome small promo tile      |
| `promo-marquee-1400x560.png`                              | Chrome marquee promo tile    |

The extension icon is `public/icon/128.png`.

## Regenerating

Screenshots use the real production popup, served locally with mocked extension APIs (`src/mock.js`) that return fake data.

```bash
./store-assets/src/generate.sh
```

Requires `pnpm install`, `python3`, and [`agent-browser`](https://github.com/vercel-labs/agent-browser). Captions live in `src/generate.sh`; layouts in `src/frame.html` and `src/promo.html`.
