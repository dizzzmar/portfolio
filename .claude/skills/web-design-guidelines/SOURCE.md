# Origen de esta skill

- Skill: `web-design-guidelines` — Vercel, https://github.com/vercel-labs/agent-skills (commit `063bee9`), licencia MIT.
- Reglas: `guidelines.md` = copia de `command.md` de https://github.com/vercel-labs/web-interface-guidelines (commit `434b7f9`).
- Revisada antes de instalar (18-10-2026): es una lista de buenas prácticas de diseño web; sin instrucciones ocultas ni scripts.

**Cambio respecto al original:** la skill original descarga las reglas de internet cada vez que se usa.
Aquí lee la copia local `guidelines.md`, para no seguir nunca instrucciones nuevas sin revisar.
Para actualizar las reglas: revisa el `command.md` nuevo y sustituye `guidelines.md`.
