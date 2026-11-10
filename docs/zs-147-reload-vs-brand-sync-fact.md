# ZS-147: reload vs клік «Вістовий» — факт (без правок)

**Автор:** клік на смугу «Вістовий» = sync ок; оновлення сторінки не зберігає / не sync. Prefs і код доступу — не причина.  
**База коду:** `main` @ `48bdbe5`, SW `vistovyi-v61`. Лише фіксація поведінки; змін у коді немає.

## Що робить клік на бренд

У `onClick` елемент `[data-sync-drive]` викликає `startDriveSync()` напряму (`zvitnist.html` ~11004–11007; також Enter/Space на смузі ~15433–15438).

`startDriveSync` → `sendReport` → `runDriveSync`: pull з Drive, merge з **живим** `state` / `bundles` у пам’яті вкладки, upsert назад. Після успіху: `save()` + `saveReportCache()` + `render()` (~8503–8505).

Тому після правок у тій самій сесії бренд-sync бачить актуальний live-стан і пише його в хмару — автор бачить «sync ок».

## Що робить оновлення сторінки (F5 / reload)

`boot()` (~15419+):

1. `installSample()` — порожній зразок у пам’яті.
2. `load()` — **лише** `loadDrivePrefs()` (client/folder/key/email). Звіт з `localStorage` **не** читається. Старі ключі сесії навмисно чистяться.
3. `applyCode` / `render` за hash або `?code=`.
4. Якщо не `?test=1` → `refreshFromNetworkOrCache()` (~15475).

`refreshFromNetworkOrCache` (~4489–4500):

| Умова | Дія |
|--------|-----|
| немає `driveFolder` або `driveEncryptKey` | **return** — ні sync, ні відновлення кешу |
| `navigator.onLine === false` | `restoreFromReportCache()` |
| онлайн + folder + key | `state.refreshFallback = true`, потім **`startDriveSync()`** |

Тобто reload **формально** теж стартує той самий `startDriveSync`, але з іншим вхідним станом (див. нижче).

## Локальний кеш є — але boot його не піднімає перед sync

- `CACHE_KEY = "zvitnist.cache.v1"` (~1366).
- `save()` (~4833–4844) після кожної зміни викликає `saveReportCache()` (ZS-105): знімок bundles/report у `localStorage`.
- `restoreFromReportCache` / `applyReportCache` (~4421–4487) уміють підняти цей знімок у `state` + `bundles`.

Хто викликає відновлення кешу:

1. офлайн у `refreshFromNetworkOrCache`;
2. помилка sync, якщо був `refreshFallback` (немає folder, або `catch` у `runDriveSync` ~8511–8513 / ~8573–8575).

**Успішний онлайн-шлях після reload кеш не застосовує.** `boot()` ніколи не робить `applyReportCache` / `restoreFromReportCache` перед `startDriveSync`.

## Чому reload «не зберігає / не sync» з точки зору автора

1. **Перед reload** правки вже в пам’яті й зазвичай у `zvitnist.cache.v1` (через `save()`), але **не обов’язково** вже на Drive, якщо бренд не тиснули.
2. **Після reload** live `state`/`bundles` знову з `installSample` (порожньо щодо реальних правок). Кеш лежить у `localStorage`, але онлайн-boot його ігнорує.
3. `startDriveSync` мерджить **порожній локальний** знімок із Drive (порядок ZS-128: pull → upsert). У upsert іде те, що вийшло з merge live+remote, а не вміст `zvitnist.cache.v1`.
4. Якщо Drive ще без останніх локальних правок — після reload вони **зникають з екрана** (live порожній / з remote). Кеш лишається в `localStorage`, доки його не перезапише наступний успішний `save()`/`saveReportCache()` уже з «очищеного» стану після sync — тоді локальний знімок теж може **перезатертися** віддаленим.
5. Prefs (folder/key) і код доступу тут ні при чому: без них sync взагалі не стартує; з ними reload **стартує** sync, але **без** підняття локального кешу в live перед merge. Це не «зламані prefs», а розрив boot ↔ cache.

Коротко: **бренд-sync = sync живого стану вкладки; reload-sync = sync з порожнього live + Drive, локальний `zvitnist.cache.v1` у цей момент не входить у merge.**

## Самотест не покриває цей розрив

`?test=1` перевіряє:

- `save()` пише в `zvitnist.cache.v1`;
- ручний `applyReportCache(loadReportCache())` відновлює;
- офлайн `refreshFromNetworkOrCache` бере кеш (~13475–13492, ~13503–13517).

Немає кроку: онлайн `boot` / `refreshFromNetworkOrCache` → успішний `startDriveSync` **без** попереднього `applyReportCache`, із непустим кешем і відмінним remote.

## Висновок (факт)

| Дія | Вхід у `startDriveSync` | Кеш `zvitnist.cache.v1` |
|-----|-------------------------|-------------------------|
| Клік «Вістовий» | поточний live після правок | пишеться після успіху; для merge не потрібен |
| Reload (онлайн, prefs ок) | live після `installSample` + prefs, **без** apply кешу | читається лише при офлайні або fail sync |

Спостереження автора узгоджується з кодом на `vistovyi-v61`: бренд sync ок; оновлення сторінки не піднімає локально збережений звіт у сесію перед мережевим sync, тому виглядає як «не зберігає / не sync» навіть при робочих prefs і коді.

**Правок у цьому документі не запропоновано і не зроблено.**
