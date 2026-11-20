# RRR-6 workaround record

## Unverified: rendered waitlist UI (plan step 16)
- Requirement: rendered comp fidelity, overflow/overlap, hierarchy, dynamic behavior (pending, error, success, duplicate states) and pixel spacing for the waitlist section at 1280px and 390px.
- Why unverified: no epic server was available (`epic-implementer epic-server turn acquire` returned `no_live_server / no_epic_server_for_this_run`, twice), and the design comps (`rally-brief/design/comps/`) are not in the repository.
- Delivered instead: static checks only. Palette contrast calculation (all pairs >= 4.5:1), token-based styling, `stack:` breakpoint, labelled controls, fieldset/legend, associated errors and a persistent `role="status"` region. Typecheck, unit tests (`npm test`) and `npm run build` pass.
- Human step still owed: before merge, run `npm run dev`, open `/#waitlist` at 1280px and 390px, and compare against the comps 13-17 for initial, error, joining, duplicate and success states.
