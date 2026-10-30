# Website maintenance and content evidence

## What is implemented

Two brand homes, a gateway, app catalogues, 15 app sites, legacy URL compatibility, founder/about pages, support, educational scope and a separated research overview. Public/upcoming apps have overview, how-it-works, details, pricing, support and privacy-summary pages. Research projects omit consumer pricing and demo pages.

The build outputs 97 canonical pages plus 15 compatible original app pages. Existing detail content is retained in structured source, with marketing presentation separated from legal and review workflows. Templates use shared CSS/JavaScript, self-hosted fonts, small app icons, canonical URLs, Open Graph metadata, Smart App Banners for known live app IDs and application structured data without fabricated ratings.

The two new marks are simplified vector/CSS interpretations of the Q/cross and Q/network direction in the supplied logo concepts. The original JPEG concept boards are not published as production logos. Raster social images are included; the SVG design sources are also retained.

## Evidence boundaries

- Feature content comes from the previous repository pages. This is not verification against app source code or a running app.
- Practice prompts, reflection notes and interface-like panels are explicitly illustrative. No real app recordings or screenshots were supplied.
- Dyslexia's browser demonstration changes only presentation of a sample paragraph. It is not the full iOS app and does not accept private documents.
- No testimonials, star ratings, clinical reviewers, credentials, endorsements or outcome statistics were invented.
- Pricing explains purchase checking rather than inventing amounts or new plans. Verify actual store and in-app offers before adding exact prices or entitlements.
- The conflicting optional-analytics marketing sentence was replaced with a reference to the existing app-specific privacy policy. The underlying policies were not rewritten.
- The existing contact email remains in use; no unconfigured brand mailbox is advertised.
- Research status and limits remain visible. No public marketing links point to the review applications.
- No analytics service or collection endpoint was added. Measurement requires choosing and reviewing a real configuration.

## Before a public launch

1. Complete desktop/mobile browser visual QA, including zoom, keyboard navigation, menu, filters and demos. Local server and Chrome rendering were blocked in the implementation environment.
2. Review copy against each shipped app version, purchase offer and privacy behaviour. Confirm ongoing availability of app IDs. UCAT and ScamLens remain upcoming, matching the prior homepage.
3. Supply actual screenshots and recordings to replace illustrative visuals where appropriate. Keep captions and distinguish product output from marketing examples.
4. Confirm the founder presentation and final brand identity; add only verified experience or review contributions.
5. Review the new English copy before commissioning translations. Earlier machine-drafted translations remain accessible under `/international/`; they are not presented as reviewed translations of the new site.
6. Recheck store marketing/support URLs after deployment. Keep old privacy URLs available for installed app versions.

## Protected paths

`care-rag-review/`, `xray-review/`, `scamlens/content/`, existing privacy/terms documents and `app-ads.txt` are not generated. The route checker verifies tracked contents of these paths have not changed.

Do not change the research origin casually: browser-local drafts and annotations are origin-dependent. A future domain migration requires its own continuity checks.

## Checks

`check.py` verifies generated local links and anchors, page headings, metadata, protected paths and absence of unverified rating schema. `check-interactions.cjs` checks the menu, filters, reader preferences/reset, sample selection and language routing using a small DOM test double. It is not a substitute for browser layout or assistive-technology testing.

## Cliniq product-page refinement

`site/health.py` owns the dedicated health-product presentation: audience and workflow profiles, feature summaries, intended use, app-specific privacy context and named developer support. The seven Cliniq app sites use a restrained blue/teal product layout across their overview and supporting pages. No clinical credentials, endorsements, validation or user outcomes were added.

Dyslexia Reading Lens now belongs to Cliniq's reading accessibility collection. All six former `/logiq-labs/dyslexia-reading-lens/` routes still serve the equivalent page with the new Cliniq canonical URL. Original `/apps/` and privacy URLs are unchanged. The sitemap lists the new canonical routes.

The local HTTP preview returned 200 during this refinement. Chrome headless exited before rendering, so visual browser verification remains outstanding. Link, migration, interaction and protected-path checks pass.
