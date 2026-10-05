# ai-team-sdlc-sample-focus-garden

Sample app built end to end with the [ai-team-sdlc](https://github.com/devopsabcs-engineering/ai-team-sdlc) Copilot plugin: ideation to production.

**Focus Garden** is a calm, offline-first focus timer. Each completed focus session grows a plant in a small garden that lives in your browser. There are no accounts, no trackers and no third-party requests.

* **Live app:** <https://devopsabcs-engineering.github.io/ai-team-sdlc-sample-focus-garden/>
* **Full evidence with screenshots (wiki):** <https://github.com/devopsabcs-engineering/ai-team-sdlc-sample-focus-garden/wiki>
* **The plugin that built it:** <https://github.com/devopsabcs-engineering/ai-team-sdlc>
* **Bilingual labs that teach the lifecycle:** <https://devopsabcs-engineering.github.io/ai-sdlc-labs/>

## How it was built

One product brief ([specs/idea.md](specs/idea.md)) went to the plugin's orchestrator. It produced the design, a clickable prototype, a PRD, an architecture, seven build slices, QA, a critic review and a security review. It stopped for a human sign-off, looped back once on changes requested, and released to GitHub Pages through a governed workflow.

Design, product and architecture documents are under [docs/](docs/). Gate evidence is under [evidence/](evidence/).

## Run it locally

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
npm run build
```

## License

Apache-2.0. See [LICENSE](LICENSE).
