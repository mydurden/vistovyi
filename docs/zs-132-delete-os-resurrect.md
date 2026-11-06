# ZS-132: видалення о/с після sync знову з хмари

Дата: 2026-11-06. **Зроблено** — `main`, SW `vistovyi-v48` (v47 мав діру).

## Симптом (повтор на v47)

Видалив о/с на телефоні → sync → люди знову з хмари, **діалог вибору не показало**.

## Діагноз регресії v47

Оверлей будується лише з `deleteConflicts`. Вони з’являлись, коли в **local snap** був tombstone (`removedPeople`), а на Диску людина ще є.

Якщо tombstone **не потрапив** у local snap (прапорець `removed` злетів / bundle без `removedPeople` / `removedAt` не зберігався), а людини вже немає в локальному `unit`, merge робив:

`remoteEntity && !localEntity → out.push(remote)` — **тихе воскресіння без діалогу**.

Навіть із 3-way base (останній sync) ця гілка спрацьовувала так само — база не питала.

Інші фактори:
- `mergeDaySliceContent` раніше не збирав `deleteConflicts` (days[] могли розійтись окремо).
- `mergeUnitIntoGeneral` міг знову вкинути о/с з файлу підлеглої, ігноруючи tombstone Загального.
- `captureBundle` / localStorage не зберігали `removedPeople` / `removedAt`.

Не підтвердилось як причина цього кейсу: upsert до pull (порядок sync лишається pull → children → upsert).

## Що змінилось у v48

1. **Base-aware delete:** немає локально + є на Диску + була в base → діалог («лишити видаленим» / «повернути з хмари»), не тихе `push(remote)`.
2. Tombstone / `removedAt` / `removedPeople` персистяться в bundle і report cache.
3. Merge днів теж збирає delete-конфлікти (з дедупом по id).
4. `mergeUnitIntoGeneral` не повертає видалених з tombstone.
5. Після pull — `captureBundle` з актуальними tomb; lead delete-конфлікти не затираються, коли відкрита вкладка unit.

## Self-test

- ZS-132: tomb + Drive → overlay → keep/restore.
- ZS-132b: **без tomb, з base** → overlay (не тихе воскресіння); без base нова з Диска — прийняти.
