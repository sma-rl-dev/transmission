# SMA tester environment

Baseline: upstream Transmission `4.1.3` at `838877323facc4cc2b677fe817e203779c437bb1`.

## Deploy and reset

```bash
./tester-env deploy
./tester-env seed
./tester-env verify
./tester-env reset
```

The CLI builds `Dockerfile.tester-env` from editable source, serves the web UI at `http://localhost:19091/transmission/web/`, and uses `tester` / `tester-env-password`. `reset` runs Compose `down -v` only for its run-scoped project; it does not remove images. `IMAGE_TAG` selects the image and `RUN_ID` scopes only Compose resources.

## Seed and verification

`seed` creates the local no-tracker transfers Arrival Manifest.pdf (512 KiB, seeding), Product Research Archive.zip (1 MiB, 50%, downloading), and Design Assets 2026-09.tar (768 KiB, stopped). `verify` checks those exact RPC-visible records.

## Browser evidence

At `host.docker.internal:19091`, the authenticated web UI showed all three seeded rows. Arrival Manifest.pdf showed Seeding, Have 524 kB (100%), Availability 100%, Error None, and `/data/downloads/Release Assets`; the Paused filter showed only Design Assets 2026-09.tar. The browser smoke also persisted the Download queue size change from 5 to 6 after reopening Preferences.
