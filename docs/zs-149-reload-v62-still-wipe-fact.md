# ZS-149: reload у vistovyi-v62 усе одно зносить правки — факт (без правок)

**Автор:** у **vistovyi-v62** після оновлення сторінки все одно не чепляє. Prefs і код доступу — не причина.  
**База:** `main` @ `2abd21c` (після ZS-148), SW **`vistovyi-v62`**. Лише фіксація; змін у коді немає.

## Що вже зроблено в ZS-148

У `refreshFromNetworkOrCache` (онлайн) перед `startDriveSync()`:

```text
applyReportCache(loadReportCache()); render();
startDriveSync();
```

Самотест stub’ає `startDriveSync` і перевіряє, що live вже має знімок з кешу. На чистому reload **без** `applyCode` це справді працює.

## Відтворення (F5 після правок)

Умови як у автора: prefs уже записані (`driveFolder` + `driveEncryptKey`), у `zvitnist.cache.v1` лежить правка (позивний `Кеш149`), потім повне оновлення сторінки.

| Крок reload | `?` / hash | Кеш після boot | На екрані `Кеш149` |
|-------------|------------|----------------|--------------------|
| A | без коду (`zvitnist.html`) | лишається (`Кеш149`, ~1110 байт) | так (ZS-148 restore ок) |
| B | `?code=lead` | **перезаписаний** (~606 байт, без `Кеш149`) | ні |
| C* | `#lead` у headless soft-nav | артефакт навігації | — |

\*Повний F5 у браузері з `#код` у адресі знову виконує весь `boot()` і йде шляхом як B (`codeFromHash()` → `applyCode`).

Prefs при цьому лишаються валідними — sync все одно стартує; «не чепляє» не через зламані prefs/код.

## Корінь: `applyCode` → `save()` раніше за ZS-148

Порядок у `boot()` (**vistovyi-v62**):

1. `installSample()` — порожній/зразок у пам’яті, `bundles` порожні.
2. `load()` — лише drive prefs (folder/key/…).
3. Якщо є `?code=` або hash → **`applyCode(bootCode)`**:
   - `activateReport` без збереженого bundle → порожній/зразок live;
   - в кінці **`save()`** → **`saveReportCache()`** записує цей порожній live у `zvitnist.cache.v1` і **затирає** добрий знімок з правками.
4. Далі `refreshFromNetworkOrCache()` (ZS-148) робить `applyReportCache(loadReportCache())` — але читає вже **перезатертий** кеш.
5. `startDriveSync()` мерджить порожній local із Drive (pull→upsert) і після успіху знову `saveReportCache()` — закріплює «порожнє» локально.

Тому ZS-148 формально «піднімає кеш перед sync», але на звичайному F5 з кодом у URL/hash піднімає вже зіпсований знімок. Клік «Вістовий» цього шляху не проходить: live з правками лишається в пам’яті, `applyCode`/`save` перед sync не викликаються.

## Чому самотест ZS-148 цього не ловить

Перевірка лише:

- є кеш;
- stub `startDriveSync`;
- `refreshFromNetworkOrCache` бачить кеш у live.

Немає кроку: **спочатку `applyCode` (як у boot з `?code=`/hash) → `save()` → потім онлайн refresh**. Саме цей порядок зносить кеш у **vistovyi-v62**.

## Висновок (факт)

У **vistovyi-v62** після F5/reload із кодом доступу в адресі правки з пристрою все одно не чепляють: не тому що prefs/код «не ті», а тому що `boot` → `applyCode` → `save`/`saveReportCache` знищує `zvitnist.cache.v1` **до** ZS-148 `applyReportCache`. Без коду в URL restore ще видно; з кодом (типовий робочий сценарій автора) — ні.

**Правок у цьому документі не запропоновано і не зроблено.**  
**Ловити спостереження / перевірку: SW `vistovyi-v62`.**
