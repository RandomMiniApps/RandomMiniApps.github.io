# Site translation status

**Status: machine-drafted. Needs native review.** Nothing in `i18n/es.json`, `i18n/pt.json`, `i18n/de.json`, or `i18n/fr.json` is native-speaker approved. A complete file is not human approval, the same rule as the app catalogs (`needs_review` is an AI draft; a state of `translated` is not approval).

English (`en-GB`) is the source. On privacy and terms pages, the English version applies if a translation differs. Each translated legal page says so and links to the English page.

| Site code | `html lang` | File | Status |
|-----------|-------------|------|--------|
| en | en-GB | English text in the HTML | Source |
| es | es | `i18n/es.json` | Machine-drafted, needs native review |
| pt | pt-BR | `i18n/pt.json` | Machine-drafted, needs native review. Brazilian Portuguese. |
| de | de | `i18n/de.json` | Machine-drafted, needs native review |
| fr | fr | `i18n/fr.json` | Machine-drafted, needs native review |

App-language lines on the homepage are not this table. They are read from `i18n/apps/scamlens.json` and `i18n/apps/dyslexia.json`, which record the locales in each app’s source catalogs.

These ScamLens privacy sentences were added when the English page was regenerated. They are machine-drafted and **needs_review** in es, pt, de, and fr:

- `ScamLens UK is built so that checking a suspicious message never turns your private messages into someone's data. The honest summary:`
- `ScamLens UK does not offer in-app purchases or subscriptions. If you choose to leave an App Store review or visit an optional external support page the developer may link to later, that happens outside the app’s checking features and does not unlock functionality. We do not receive payment details.`
- `ScamLens UK — Privacy Policy` (page title and heading; required so the translated page does not keep the English sentence)
