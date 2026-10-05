# Focus Garden clickable prototype

Throwaway design spike for **T-002**. This is not production implementation and should not be
promoted into the Vite application.

Open `index.html` directly in a browser, or serve this directory with any static file server.
The timer's **Preview completed session** shortcut intentionally avoids a 25-minute wait so
stakeholders can validate completion, garden, and plant-detail interactions.

Prototype-only simplifications:

- time does not elapse and no sound plays;
- export reports its state without writing a file;
- import uses valid and invalid samples rather than the operating-system file picker;
- seed data is fixed to make weekly garden and detail states immediately reviewable;
- persistence, offline caching, installability, and production timer correctness remain for spec
  and implementation.
