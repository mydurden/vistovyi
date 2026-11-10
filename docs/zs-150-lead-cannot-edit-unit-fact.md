# ZS-150: lead не править unit + «Мережа… / розшифрувався» — факт (без правок)

**Автор:** lead не може правити звіти unit. Під назвою: «Мережа не відповіла або файл не розшифрувався.» Prefs і код доступу — не причина.  
**База:** `main` @ `2abd21c`, SW **`vistovyi-v62`**. Лише фіксація; змін у коді немає.  
**Уточнення автора (++):** на **vistovyi-v62** у факті **відокремити мережу** від **decrypt `unit.code` для lead**. Без правок.

## Підпис під назвою — один рядок, дві різні ідеї

Текст ставиться лише в `catch` `runDriveSync` (~8512–8520), якщо не `nocode` / не `noname`:

> «Мережа не відповіла або файл не розшифрувався.»

ZS-111 показує його під title-row (`isVisibleDriveNote` + `appendDriveSyncStatus`). Prefs тут ні при чому: без folder/key sync до цього catch з цим текстом не доходить.

У UI **склеєно «або»** дві різні відмови. У коді на **vistovyi-v62** вони **не** один шлях.

---

## A. Мережа (те, що реально ставить цей підпис)

До `runDriveSync.catch` долітають **необроблені reject** кроків Drive API, наприклад:

- `downloadSettingsFile` / `uploadSettingsFile` → `throw new Error("download"|"update"|"create")` при `!response.ok`;
- `downloadBinaryFile` / upload lead (`upsertKeyedUnitFile` для `driveEncryptKey`) без локального `.catch`;
- збій list/resolve на шляху settings / own file, який не проковтнули.

Це **мережа / HTTP / OAuth-токен до Google**, не перевірка коду доступу в prefs. Підпис catch-all саме про цей клас збоїв (плюс будь-який інший необроблений reject з іншим `message`).

Після такого catch: progress скидається; якщо був `refreshFallback` — спроба `restoreFromReportCache`. Unit-merge / запис unit у цьому sync **не завершуються**.

---

## B. Decrypt `unit.code` для lead (окремий шлях, не той підпис)

Lead тягне файли підлеглих у `syncChildUnits` (~8301–8365):

1. `resolveUnitDriveFile(..., decryptKey: code)` — `code` = **код unit**;
2. `downloadBinaryFile`;
3. **`decryptWithCode(code, bytes)`** — AES пароль = **`unit.code`**, не `driveEncryptKey` lead.

| Подія | Що робить код | Чи ставить «Мережа… розшифрувався» |
|-------|----------------|-------------------------------------|
| Немає файлу / resolve порожній | `missing++`, статус `missing` | ні |
| `decryptWithCode(unit.code)` reject (`format` / AES) | `.catch` на child (~8362–8365): `missing++`, статус `missing` | **ні** |
| JSON parse fail після decrypt | `missing++` локально | ні |
| Upsert child після merge fail | `.catch(() => null)` (~8357–8359) | ні |

Тобто для lead **провал розшифрування файлу unit ключем `unit.code` навмисно тихий**: ланка лишається «Відсутній звіт», sync **продовжується**. Це **не** той самий механізм, що видимий catch-all під назвою.

Lead-файл (`vu-lead.bin`) окремо: `pullOwnUnitFile` decrypt’ить **`driveEncryptKey`**; свій `.catch` → `{pulled:false}`, теж **без** цього підпису.

Два ключі:

| Blob | Пароль AES |
|------|------------|
| `vu-lead.bin` | `driveEncryptKey` (код lead) |
| `vu-<slug>.bin` unit | **`unit.code`** |

Prefs «ок» і код lead у формі **не** відкривають unit-blob; для unit потрібен саме код ланки як пароль файлу.

---

## Чому lead «не править» unit (зв’язок із A/B)

1. Вкладку unit можна відкрити (`canOpenUnitReport`); UI `scope === "all"` дозволяє локальні правки.
2. На Диск unit пишеться з ключем **`unit.code`**, коли `driveChildWriteCode()` / `viewingManagedChild()` бачать підлеглу (~3830–3857, `upsertOwnUnitFile`).
3. У «Загальний» unit потрапляє через `ingestChildUnit` → `mergeUnitIntoGeneral` після **успішного** pull/merge файлу unit (~8059+, ~8272–8276) — не через правку lead-файлу «як unit».
4. Якщо впав шлях **A (мережа)** → видимий підпис → sync обірваний → запис/merge unit не доходять.
5. Якщо впав шлях **B (decrypt `unit.code`)** → підпису немає, статус unit `missing` → merge в загальний з цього файлу теж немає; локальна вкладка для автора все одно «не чепляє» на Диск/загальний.

Спостереження автора (підпис + «не править unit») узгоджується з **A** як причиною видимого тексту; **B** — окрема відмова decrypt unit, яку UI зараз лише плутає словами «або файл не розшифрувався» в тому ж рядку, хоча код lead→unit decrypt у catch-all **не** кладе.

## Висновок (факт)

На **vistovyi-v62**:

- **Мережа** → необроблений reject у `runDriveSync` → підпис під назвою.
- **Decrypt `unit.code` (lead читає unit)** → локальний `missing`, sync іде далі → **інший** контур; підпис сам по собі не ставить.
- Prefs/код lead не причина жодного з двох; unit-файл шифрується кодом unit.
- Правок у цьому документі не зроблено (лише розведення фактів A/B).

**Ловити / перевіряти: SW `vistovyi-v62`.**
