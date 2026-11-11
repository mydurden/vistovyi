# ZS-152: локальний add на F5 + delete-діалог до upsert (vistovyi-v65)

Після `++` автора за фактом `docs/zs-152-new-person-f5-wipe-fact.md` (у store).

## Що змінилось

1. **F5 / авто-`startDriveSync`:** після merge з Диском `restorePreservedAliveCards` повертає локально живі картки, яких немає в remote tomb; порожній remote більше не зносить локальний add.
2. **Delete-конфлікт:** до вибору в діалозі tomb **не** потрапляє в `removedPeople` знімка; запис з Диска лишається в списку (`thawPendingLocalRemoves`); **upsert на Диск відкладається**, поки висять merge-діалоги; «Повернути з хмари» лишає людину, «Лишити видаленим» архівує лише після кліку.
3. **Кеш:** `reportCachePayloadHasContent` рахує tomb/архів як вміст — архів останньої людини пишеться в `zvitnist.cache.v1`.

SW: **vistovyi-v65**. `APP_BUILD_AT` `2026-11-11T15:35:00.000Z`. Самотести ZS-152 + оновлені ZS-132/137.
