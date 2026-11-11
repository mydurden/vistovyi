# ZS-151: reload тримає локальне (vistovyi-v64)

Після `++` автора: boot піднімає `zvitnist.cache.v1` до `applyCode`; порожній live більше не затирає багатий кеш. Онлайн reload далі мерджить із Диском; розбіжності — існуючі merge-діалоги. Brand-bar sync без змін.

SW: **vistovyi-v64**. Самотест `?test=1` PASS; CDP `?code=lead` лишає маркер у кеші й на екрані.
