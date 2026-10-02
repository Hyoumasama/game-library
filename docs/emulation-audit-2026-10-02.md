# مسح ألعاب Emulation — 2 أكتوبر 2026

> تحديث Platform: اكتمل تغيير Platform فعليًا في قاعدة البيانات لجميع سجلات Emulation الـ153 إلى جهاز النسخة (مثل Yuzu → Nintendo Switch)، مع إبقاء Store وHardware كما هما. أكد المستخدم النسخ الست الأخيرة: Metroid Prime وPrime 2 = Wii Trilogy؛ Nightmare Creatures على RetroArch = Nintendo 64 (ونسخة DuckStation = PlayStation)؛ The Legend of Zelda وZelda II = NES؛ A Link to the Past = SNES. نسخة القيم السابقة في [emulation-platform-before-2026-10-02.json](emulation-platform-before-2026-10-02.json). الجدول الأصلي أدناه يمثل لقطة المسح قبل التعديل، ولا يمثل قيم Platform الحالية.

> تحديث الشعارات: تمت إضافة جميع الشعارات الناقصة الواردة في هذا التقرير، بما فيها xemu وAzahar وMSX2 وXbox الأصلي، مع نسخ فاتحة لـ3DS وDS وGBC تناسب الخلفية الداكنة. تم إصلاح ربط Xenia وVita3K وإضافة أسماء الأجهزة في `lib/gameIcons.ts`. جدول الجرد أدناه يسجل حالة الشعارات وقت المسح قبل الإضافة. المصادر والتراخيص في [emulation-logo-sources.json](emulation-logo-sources.json)، والمعاينة في [emulation-logos-preview.png](emulation-logos-preview.png). لم يتم تعديل بيانات الألعاب.

المصدر: قراءة مباشرة من قاعدة مكتبة Nawaf Game Library. تم فحص جميع **153 سجلًا** المصنفة Emulation، مع البحث أيضًا بأسماء المحاكيات في Store وPlatform. لم يتم تغيير قاعدة البيانات أو الشعارات.

المحاكي المسجل يمثل بيانات المكتبة، وليس إثباتًا أن البرنامج مثبت فعليًا على الكمبيوتر. لا تتوفر هنا قائمة برامج الكمبيوتر أو ملفات ROM أو إعدادات RetroArch، ولذلك الجهاز المستهدف مستنتج من المحاكي ونوع اللعبة، وتظهر الحالات غير المحسومة صراحة.

«جهاز النسخة» هو الجهاز الذي يحاكيه البرنامج لإصدار اللعبة الموجود بالمكتبة؛ «أصل اللعبة» يوضح الجهاز السابق عندما تكون النسخة نقلًا/ريماستر/إعادة صنع. هذا التفريق يمنع تصنيف نسخة Switch من Pikmin على أنها GameCube في واجهة المحاكاة.

## أخطاء ربط تحتاج تصحيح

| ID | اللعبة | المسجل | الصحيح | الجهاز |
|---|---|---|---|---|
|2065|The Last Story|Azahar|Dolphin|Wii|
|1162|Radiant Historia: Perfect Chronology|Dolphin|Citra أو Azahar|3DS|
|1178|The Legend of Zelda: Four Swords Adventures|melonDS|Dolphin|GameCube|
|1090|Ape Escape: On the Loose|PCSX2|PPSSPP|PSP|
|1116|Lost Odyssey|Store: Xenia / Platform: XEMU|Xenia في الحقلين|Xbox 360|

المصادر: [The Last Story — Nintendo](https://www.nintendo.com/en-gb/Games/Wii/The-Last-Story-283487.html)، [Radiant Historia — Nintendo of America](https://www.youtube.com/watch?v=5gPSbziUdmU)، [Four Swords Adventures — Nintendo](https://www.nintendo.com/en-gb/Games/Nintendo-GameCube/The-Legend-of-Zelda-Four-Swords-Adventures-269028.html)، [On the Loose — PlayStation](https://store.playstation.com/en-us/concept/10006481/)، [Azahar](https://www.azahar-emu.org/)، [Xenia](https://xenia.jp/)، [xemu](https://xemu.app/docs/about/).

## جرد الشعارات

| العنصر | حالة الملف | حالة الربط / الإجراء المطلوب |
|---|---|---|
|Azahar|ناقص|إضافة شعار وربطه؛ السجل الوحيد الحالي له لعبة مربوطة خطأ|
|xemu|ناقص|الربط الحالي يستخدم xenia.png خطأ؛ لا توجد لعبة Xbox أصلي مؤكدة في هذه القائمة|
|Xenia|موجود: public/platforms/xenia.png|ناقص في getIcon؛ يحتاج ربطًا مستقلًا|
|Vita3K|موجود: public/platforms/vita3k.svg|getIcon يطلب vita3k.png غير الموجود؛ استخدام SVG|
|PlayStation / PS1|موجود: public/hardware/playstation.png|يحتاج ربط اسم الجهاز في getIcon|
|PlayStation 2 / PS2|موجود: public/hardware/playstation2.png|يحتاج ربط اسم الجهاز في getIcon|
|PlayStation 3 / PS3|موجود: public/hardware/playstation3.png|مربوط باسم ps3 فقط|
|Nintendo Switch|موجود: public/platforms/switch.png|مربوط باسم switch فقط؛ يحتاج alias للاسم الكامل|
|Xbox الأصلي|موجود ملف باسم xbox في hardware وplatforms|يحتاج مراجعة بصرية لملاءمة شعار الجيل الأصلي؛ xbox الحالي في getIcon يشير لشعار المنصة|
|Xbox 360|لا يوجد ملف مستقل|إضافة شعار للجيل المحدد|
|Wii|ناقص|إضافة شعار|
|Wii U|ناقص|إضافة شعار|
|GameCube|ناقص|إضافة شعار|
|Nintendo 3DS|ناقص|إضافة شعار|
|Nintendo DS|ناقص|إضافة شعار|
|Nintendo 64|ناقص|إضافة شعار|
|Game Boy Advance|ناقص|إضافة شعار|
|Game Boy Color|ناقص|إضافة شعار|
|PSP|ناقص|إضافة شعار الجهاز؛ شعار PPSSPP موجود لكنه شعار المحاكي|
|PS Vita|ناقص|إضافة شعار الجهاز؛ شعار Vita3K ليس شعار الجهاز|
|NES / Famicom|ناقص|مطلوب لأصل ألعاب Zelda؛ استعمال النسخة يحتاج تأكيد ROM|
|SNES / Super Famicom|ناقص|مطلوب لأصل A Link to the Past وSuper Mario RPG؛ نسخة A Link to the Past تحتاج تأكيد|
|Game Boy|ناقص|مطلوب إذا عرضنا أصل Link’s Awakening؛ النسخ الحالية هنا Switch|
|MSX2|ناقص|مطلوب إذا عرضنا أصل Metal Gear وMetal Gear 2؛ النسخ المسجلة داخل PS3|

شعارات المحاكيات الأخرى موجودة ومربوطة: Yuzu، Citra، CEMU، Dolphin، RetroArch، Ryujinx، RPCS3، DuckStation، PCSX2، melonDS، PrimeHack، PPSSPP.

## تعداد المحاكيات المسجلة

| المحاكي | عدد السجلات |
|---|---:|
|Yuzu|47|
|Duckstation|16|
|PCSX2|24|
|RPCS3|9|
|RetroARCH|11|
|Citra|17|
|Xenia|2|
|Dolphin|11|
|melonDS|5|
|Ryujinx|2|
|PPSSPP|1|
|PrimeHACK|3|
|Vita3k|1|
|CEMU|3|
|Azahar|1|

## جميع الألعاب

الأعداد تشمل السجلات المنفصلة؛ هناك سجلان لـLink’s Awakening على Yuzu، ونسختان مختلفتان لـLuigi’s Mansion على Citra وDolphin. لا تُحذف النسخ تلقائيًا.

| ID | اللعبة | المحاكي المسجل | المحاكي المناسب | جهاز النسخة | أصل اللعبة | ملاحظات |
|---|---|---|---|---|---|---|
|2070|13 Sentinels: Aegis Rim|Yuzu|Yuzu|Nintendo Switch|PlayStation 4|مستنتج من المحاكي/النسخة|
|1131|A Bug's Life|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1101|Ape Escape|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1078|Ape Escape 2|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1084|Ape Escape 3|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1090|Ape Escape: On the Loose|PCSX2|PPSSPP|PSP|PSP|ربط خاطئ: On the Loose إصدار PSP؛ PCSX2 خاص بـPS2.|
|1069|Astral Chain|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1076|Asura's Wrath|RPCS3|RPCS3|PlayStation 3|PlayStation 3|مستنتج من المحاكي/النسخة|
|1051|Bayonetta 2|Yuzu|Yuzu|Nintendo Switch|Wii U|مستنتج من المحاكي/النسخة|
|1045|Bayonetta 3|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1074|Bayonetta Origins: Cereza and the Lost Demon|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|2621|Chaos Legion|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1123|Crash Bandicoot™ The Huge Adventure|RetroARCH|RetroARCH|Game Boy Advance|Game Boy Advance|مستنتج من المحاكي/النسخة|
|1120|Darkwatch|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1085|Dino Crisis|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1089|Dino Crisis 2|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1121|Donkey Kong Country Returns 3D|Citra|Citra|Nintendo 3DS|Wii|مستنتج من المحاكي/النسخة|
|1029|Donkey Kong Country Tropical Freeze|Yuzu|Yuzu|Nintendo Switch|Wii U|مستنتج من المحاكي/النسخة|
|1100|Driver|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1083|Driver 2|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1588|Fatal Frame|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1587|Fatal Frame II: Crimson Butterfly|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1589|Fatal Frame III: The Tormented|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1073|Fire Emblem Engage|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1072|Fire Emblem Three Houses|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1127|God Hand|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1092|Heavenly Sword|RPCS3|RPCS3|PlayStation 3|PlayStation 3|مستنتج من المحاكي/النسخة|
|1122|Jackie Chan Adventures|PCSX2|PCSX2|PlayStation 2|PlayStation 2|تاريخ 2001 لا يوافق لعبة PS2؛ تحقق من عدم خلطها بإصدار GBA.|
|1113|Jackie Chan Stuntmaster|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1137|Kid Icarus Uprising|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1041|Kirby and the Forgotten Land|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1118|Kirby Planet Robobot|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1043|Kirby Star Allies|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1112|Kirby Triple Deluxe|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1142|Kirby's Extra Epic Yarn|Citra|Citra|Nintendo 3DS|Wii|مستنتج من المحاكي/النسخة|
|1028|Kirby's Return to Dream Land Deluxe|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1082|Lollipop Chainsaw|RPCS3|RPCS3|PlayStation 3|PlayStation 3|مستنتج من المحاكي/النسخة|
|1116|Lost Odyssey|Xenia / Platform: XEMU|Xenia|Xbox 360|Xbox 360|Store = Xenia، Platform = XEMU؛ الصحيح Xenia / Xbox 360.|
|1034|Luigi's Mansion|Citra|Citra|Nintendo 3DS|GameCube|مستنتج من المحاكي/النسخة|
|1175|Luigi's Mansion|Dolphin|Dolphin|GameCube|GameCube|Dolphin يعني نسخة GameCube؛ تاريخ الإصدار وIGDB مرتبطان بنسخة 3DS.|
|1375|Luigi's Mansion 2 HD|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1030|Luigi's Mansion 3|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1177|Luigi's Mansion: Dark Moon|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|2619|Magna Carta: Tears of Blood|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|2620|MagnaCarta 2|Xenia|Xenia|Xbox 360|Xbox 360|مستنتج من المحاكي/النسخة|
|1132|Mario & Luigi - Bowser's Inside Story + Bowser Jr.'s Journey|Citra|Citra|Nintendo 3DS|Nintendo DS|العنوان يشير إلى إعادة إصدار 3DS؛ IGDB الحالي يشير إلى نسخة DS الأصلية.|
|1125|Mario & Luigi - Dream Team|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1114|Mario & Luigi - Paper Jam|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1138|Mario & Luigi - Partners in Time|melonDS|melonDS|Nintendo DS|Nintendo DS|مستنتج من المحاكي/النسخة|
|1124|Mario & Luigi - Superstar Saga + Bowser's Minions|Citra|Citra|Nintendo 3DS|Game Boy Advance|مستنتج من المحاكي/النسخة|
|1382|Mario & Luigi: Brothership|Ryujinx|Ryujinx|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1148|Mario Golf: Super Rush|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1057|Mario Kart 8 Deluxe|Yuzu|Yuzu|Nintendo Switch|Wii U|مستنتج من المحاكي/النسخة|
|1063|Mario Party Superstars|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1062|Mario Strikers Battle League|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1147|Mario Tennis Aces|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1036|Mario vs. Donkey Kong|Yuzu|Yuzu|Nintendo Switch|Game Boy Advance|مستنتج من المحاكي/النسخة|
|1119|Maximo|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1129|Maximo Army of Zin|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1156|Metal Gear|RPCS3|RPCS3|PlayStation 3|MSX2|مستنتج من المحاكي/النسخة|
|1154|Metal Gear 2: Solid Snake|RPCS3|RPCS3|PlayStation 3|MSX2|مستنتج من المحاكي/النسخة|
|1144|Metal Gear Solid|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1143|Metal Gear Solid 2: Sons of Liberty HD|RPCS3|RPCS3|PlayStation 3|PlayStation 2|مستنتج من المحاكي/النسخة|
|1155|Metal Gear Solid 3: Snake Eater HD|RPCS3|RPCS3|PlayStation 3|PlayStation 2|مستنتج من المحاكي/النسخة|
|1146|Metal Gear Solid: Peace Walker HD|RPCS3|RPCS3|PlayStation 3|PSP|مستنتج من المحاكي/النسخة|
|1151|Metal Gear Solid: Portable|PPSSPP|PPSSPP|PSP|PSP|مستنتج من المحاكي/النسخة|
|1026|Metroid Dread|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1102|Metroid Prime|PrimeHACK|PrimeHACK|GameCube / Wii — تحتاج تأكيد|GameCube|PrimeHack يدعم GameCube وWii؛ يلزم تحديد هل ROM الأصلي أو Trilogy.|
|1103|Metroid Prime 2: Echoes|PrimeHACK|PrimeHACK|GameCube / Wii — تحتاج تأكيد|GameCube|PrimeHack يدعم GameCube وWii؛ يلزم تحديد هل ROM الأصلي أو Trilogy.|
|1107|Metroid Prime 3|PrimeHACK|PrimeHACK|Wii|Wii|مستنتج من المحاكي/النسخة|
|1027|Metroid Prime Remastered|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1160|Muramasa Rebirth|Vita3k|Vita3k|PS Vita|PS Vita|مستنتج من المحاكي/النسخة|
|1110|New Super Mario Bros.|melonDS|melonDS|Nintendo DS|Nintendo DS|مستنتج من المحاكي/النسخة|
|1108|New Super Mario Bros. 2|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1046|New Super Mario Bros. U Deluxe|Yuzu|Yuzu|Nintendo Switch|Wii U|مستنتج من المحاكي/النسخة|
|1109|New Super Mario Bros. Wii|Dolphin|Dolphin|Wii|Wii|مستنتج من المحاكي/النسخة|
|1130|Nightmare Creatures|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1135|Nightmare Creatures|RetroARCH|RetroARCH|Nintendo 64|Nintendo 64|السجل المحلي القديم سماه (N64)؛ نحتاج core/ROM للتأكيد لأن اللعبة موجودة أيضًا على PS1.|
|1141|Nightmare Creatures 2|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1165|Odin Sphere: Leifthrasir|RPCS3|RPCS3|PlayStation 3|PlayStation 3|مستنتج من المحاكي/النسخة|
|1088|Onimusha 2: Samurai's Destiny|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1091|Onimusha 3: Demon Siege|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1080|Onimusha Blade Warriors|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1096|Onimusha: Dawn of Dreams|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1098|Onimusha: Warlords|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1134|Paper Mario|RetroARCH|RetroARCH|Nintendo 64|Nintendo 64|مستنتج من المحاكي/النسخة|
|1180|Paper Mario: Color Splash|CEMU|CEMU|Wii U|Wii U|مستنتج من المحاكي/النسخة|
|1185|Paper Mario: Sticker Star|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1048|Paper Mario: The Origami King|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1170|Paper Mario: The Thousand-Year Door|Dolphin|Dolphin|GameCube|GameCube|Dolphin يعني GameCube؛ تاريخ 2024 يخص إعادة إصدار Switch.|
|1077|Pepsiman|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1049|Pikmin|Yuzu|Yuzu|Nintendo Switch|GameCube|مستنتج من المحاكي/النسخة|
|1053|Pikmin 2|Yuzu|Yuzu|Nintendo Switch|GameCube|مستنتج من المحاكي/النسخة|
|1037|Pikmin 3 Deluxe|Yuzu|Yuzu|Nintendo Switch|Wii U|مستنتج من المحاكي/النسخة|
|1042|Pikmin 4|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1136|Prince of Persia: The Lost Crown|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1075|Princess Peach: Showtime!|Ryujinx|Ryujinx|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1140|Punch-Out!! (2009)|Dolphin|Dolphin|Wii|Wii|مستنتج من المحاكي/النسخة|
|1162|Radiant Historia: Perfect Chronology|Dolphin|Citra / Azahar|Nintendo 3DS|Nintendo 3DS|ربط خاطئ: Perfect Chronology إصدار 3DS؛ Dolphin لا يشغله.|
|1139|Red Dead Revolver|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1181|Shin Megami Tensei: Digital Devil Saga|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1176|Shin Megami Tensei: Digital Devil Saga 2|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1095|Silent Hill|Duckstation|Duckstation|PlayStation|PlayStation|العنوان وDuckStation يشيران إلى Silent Hill على PS1؛ IGDB الحالي يشير إلى Origins.|
|1099|Silent Hill 2|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1093|Silent Hill 3|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|2071|Silent Hill 4: The Room|PCSX2|PCSX2|PlayStation 2|PlayStation 2|مستنتج من المحاكي/النسخة|
|1060|Splatoon 2|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1061|Splatoon 3|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1174|Star Fox 64|RetroARCH|RetroARCH|Nintendo 64|Nintendo 64|مستنتج من المحاكي/النسخة|
|1161|Star Fox Adventures|Dolphin|Dolphin|GameCube|GameCube|مستنتج من المحاكي/النسخة|
|1183|Star Fox: Assault|Dolphin|Dolphin|GameCube|GameCube|مستنتج من المحاكي/النسخة|
|1067|Super Mario 3D Land|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1025|Super Mario 3D World + Bowser's Fury|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1039|Super Mario 64|RetroARCH|RetroARCH|Nintendo 64|Nintendo 64|مستنتج من المحاكي/النسخة|
|1033|Super Mario Bros. Wonder|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1050|Super Mario Galaxy|Dolphin|Dolphin|Wii|Wii|مستنتج من المحاكي/النسخة|
|1066|Super Mario Galaxy 2|Dolphin|Dolphin|Wii|Wii|مستنتج من المحاكي/النسخة|
|1058|Super Mario Maker 2|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1059|Super Mario Party|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1379|Super Mario Party Jamboree|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1044|Super Mario RPG|Yuzu|Yuzu|Nintendo Switch|SNES|مستنتج من المحاكي/النسخة|
|1038|Super Mario Sunshine|Dolphin|Dolphin|GameCube|GameCube|مستنتج من المحاكي/النسخة|
|1115|Super Paper Mario|Dolphin|Dolphin|Wii|Wii|مستنتج من المحاكي/النسخة|
|1056|Super Smash Bros. Ultimate|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|العنوان Ultimate وYuzu يشيران إلى Switch؛ IGDB الحالي يشير إلى Super Smash Bros. الأصلي.|
|1087|Tenchu 2 Birth of the Stealth Assassin|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1097|Tenchu Stealth Assassin|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|2065|The Last Story|Azahar|Dolphin|Wii|Wii|ربط خاطئ: اللعبة Wii؛ Azahar خاص بـ3DS.|
|1166|The Legend of Zelda|RetroARCH|RetroARCH|NES / Game Boy Advance — تحتاج تأكيد|Famicom Disk System / NES|تاريخ 2004 يرجح Classic NES Series على GBA، بينما العنوان/IGDB للأصل؛ نحتاج core/ROM.|
|1168|The Legend of Zelda: A Link Between Worlds|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1172|The Legend of Zelda: A Link to the Past|RetroARCH|RetroARCH|SNES / Game Boy Advance — تحتاج تأكيد|SNES|تاريخ 2002 يرجح إصدار GBA؛ العنوان/IGDB للأصل على SNES؛ نحتاج core/ROM.|
|1378|The Legend of Zelda: Echoes of Wisdom|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1178|The Legend of Zelda: Four Swords Adventures|melonDS|Dolphin|GameCube|GameCube|ربط خاطئ: Four Swords Adventures لعبة GameCube؛ لا تخلطها مع Four Swords.|
|1054|The Legend of Zelda: Link's Awakening|Yuzu|Yuzu|Nintendo Switch|Game Boy|مستنتج من المحاكي/النسخة|
|1184|The Legend of Zelda: Link's Awakening|Yuzu|Yuzu|Nintendo Switch|Game Boy|مستنتج من المحاكي/النسخة|
|1040|The Legend of Zelda: Majora's Mask 3D|Citra|Citra|Nintendo 3DS|Nintendo 3DS|مستنتج من المحاكي/النسخة|
|1173|The Legend of Zelda: Ocarina of Time|Citra|Citra|Nintendo 3DS|Nintendo 64|Citra يعني Ocarina of Time 3D؛ العنوان/IGDB مسجلان للإصدار القديم.|
|1164|The Legend of Zelda: Oracle of Ages|RetroARCH|RetroARCH|Game Boy Color|Game Boy Color|مستنتج من المحاكي/النسخة|
|1169|The Legend of Zelda: Oracle of Seasons|RetroARCH|RetroARCH|Game Boy Color|Game Boy Color|مستنتج من المحاكي/النسخة|
|1163|The Legend of Zelda: Phantom Hourglass|melonDS|melonDS|Nintendo DS|Nintendo DS|مستنتج من المحاكي/النسخة|
|1032|The Legend of Zelda: Skyward Sword HD|Yuzu|Yuzu|Nintendo Switch|Wii|مستنتج من المحاكي/النسخة|
|1171|The Legend of Zelda: Spirit Tracks|melonDS|melonDS|Nintendo DS|Nintendo DS|مستنتج من المحاكي/النسخة|
|1094|The Legend of Zelda: Tears of the Kingdom|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1167|The Legend of Zelda: The Minish Cap|RetroARCH|RetroARCH|Game Boy Advance|Game Boy Advance|مستنتج من المحاكي/النسخة|
|1035|The Legend of Zelda: The Twilight Princess|CEMU|CEMU|Wii U|GameCube / Wii|CEMU يعني Twilight Princess HD على Wii U؛ بيانات النسخة تحتاج مراجعة.|
|1047|The Legend of Zelda: The Wind Waker|CEMU|CEMU|Wii U|GameCube|CEMU يعني The Wind Waker HD على Wii U؛ العنوان/IGDB للإصدار الأصلي.|
|1133|Unicorn Overlord|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1179|Vagrant Story|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1117|Windjammers 2|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1068|Xenoblade Chronicles 2|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1070|Xenoblade Chronicles 3|Yuzu|Yuzu|Nintendo Switch|Nintendo Switch|مستنتج من المحاكي/النسخة|
|1071|Xenoblade Chronicles Definitive Edition|Yuzu|Yuzu|Nintendo Switch|Wii|مستنتج من المحاكي/النسخة|
|1079|Xenogears|Duckstation|Duckstation|PlayStation|PlayStation|مستنتج من المحاكي/النسخة|
|1182|Zelda II: The Adventure of Link|RetroARCH|RetroARCH|NES / Game Boy Advance — تحتاج تأكيد|Famicom Disk System / NES|تاريخ 2004 يرجح Classic NES Series على GBA؛ نحتاج core/ROM.|

## حدود الفحص

ليس في جدول games حقل مستقل للجهاز الأصلي؛ hardware يسجل PC أو Steamdeck، وstore/platform يسجلان المحاكي. أُنتج هذا الجرد كتقرير مستقل ولم يتم استبدال Hardware بالجهاز الأصلي. معظم الربط مستنتج من المحاكي المسجل؛ لم يتم التحقق خارجيًا من كل إصدار لكل سجل. أخطاء النسخ والهوية الظاهرة في الملاحظات تحتاج مراجعة قبل أي تحديث جماعي للبيانات.

