# INITIATIVE – InvoSpace

| | |
| --- | --- |
| **ID** | INIT-1 |
| **Názov** | InvoSpace – evidencia bločkov a podklady pre účtovníctvo v mobile |
| **Vlastník** | Michal Mateasik |
| **Začiatok vývoja** | 3. 10. 2026 |
| **Dátum dokumentu** | 19. 10. 2026 |
| **Stav** | Realizované (verzia 1.0); overenie importu do reálnej Pohody je otvorená položka |
| **Súvisiace dokumenty** | [EPICS.md](EPICS.md), [USER_STORIES.md](USER_STORIES.md), [README.md](../README.md) |

## 1. Problém

Firmy a ich zamestnanci dostávajú pri bežných nákupoch (pohonné látky, potraviny, kancelárske potreby, reštaurácie) papierové bločky z registračných pokladníc eKasa. Pri ich spracovaní vznikajú tieto problémy:

- papierové bločky sa strácajú alebo blednú (termopapier),
- údaje z bločkov sa do účtovného programu prepisujú ručne, čo je zdĺhavé a náchylné na chyby (suma, dátum, IČO dodávateľa, DPH po sadzbách),
- jedna osoba často eviduje bločky pre viac firiem a doklady sa miešajú,
- účtovník potrebuje doklady v číslovanom rade a s rozpisom DPH po sadzbách.

## 2. Cieľ (vízia)

Vytvoriť mobilnú aplikáciu pre iPhone, v ktorej používateľ bloček **zaeviduje za pár sekúnd** (naskenovaním QR kódu eKasa alebo ručne s fotkou), doklady **eviduje oddelene podľa firiem** a na konci mesiaca z nich jedným krokom vytvorí **XML súbor na import do účtovného programu Pohoda**. Všetky údaje ostávajú v telefóne používateľa.

## 3. Zainteresované strany

| Strana | Záujem |
| --- | --- |
| **Používateľ** (majiteľ firmy, zamestnanec) | Rýchlo a bez prepisovania evidovať bločky, mať prehľad o výdavkoch, nestratiť doklady. |
| **Účtovník** | Správne a úplné podklady: číslo dokladu, dodávateľ, IČO, základ a DPH po sadzbách, predkontácia, bez ručného prepisovania. |
| **Vyučujúci** (školský projekt) | Funkčný, zrozumiteľný a obhájiteľný projekt|

## 4. Ciele a kritériá úspechu

| # | Cieľ | Kritérium úspechu |
| --- | --- | --- |
| C1 | Zrýchliť zaevidovanie bločku | Z naskenovaného QR kódu sa predvyplní dodávateľ, IČO, dátum, suma, číslo dokladu a rozpis DPH; používateľ ich len skontroluje a uloží. |
| C2 | Neprísť o doklady | Doklady aj fotky sú trvalo uložené v telefóne, dajú sa zálohovať do jedného súboru a obnoviť. |
| C3 | Oddeliť evidenciu firiem | Doklady, číslovanie, prehľady a export patria vždy jednej firme. |
| C4 | Dať účtovníkovi použiteľné podklady | Mesačný XML súbor je platný voči oficiálnym schémam Stormware a obsahuje všetky potrebné údaje. |
| C5 | Poskytnúť prehľad výdavkov | Mesačný aj ročný prehľad so súčtami podľa kategórií; súčty sedia so zoznamom dokladov. |
| C6 | Spoľahlivosť | Aplikácia nespadne pri chybe siete, súborov ani databázy a používateľ dostane zrozumiteľnú hlášku. |
| C7 | Dostupnosť bez Macu | Aplikácia sa vyvíja na Windows a beží na iPhone cez Expo Go; dá sa zdieľať s vybranými ľuďmi. |

## 5. Rozsah

### V rozsahu
- evidencia dokladov (ručne, fotkou z kamery alebo galérie, QR kódom eKasa),
- kategórie a zapamätanie kategórie pre obchod,
- viac firiem s vlastnými údajmi, nastaveniami exportu a číslovaním dokladov,
- suma s DPH a bez DPH, rozpis DPH po sadzbách,
- mesačné a ročné prehľady s grafmi,
- export mesačného XML pre Pohodu,
- záloha a obnova dát,
- zdieľanie aplikácie s vybranými ľuďmi cez Expo Go (EAS Update).

### Mimo rozsahu
- OCR rozpoznávanie textu z fotky,
- Face ID / biometria,
- synchronizácia, cloud, server, prihlasovanie používateľov,
- viac mien (len EUR),
- PDF export (nahradený XML exportom pre Pohodu na žiadosť zadávateľa),
- uloženie celej odpovede eKasa (položky bločku, podpisové kódy),
- publikovanie v App Store a Android-špecifické úpravy.

## 6. Obmedzenia a architektonické rozhodnutia

| Rozhodnutie | Dôvod |
| --- | --- |
| **React Native + Expo SDK 57, TypeScript (strict)** | Vývoj na Windows bez Macu; Expo Go na iPhone. |
| **Všetko beží v Expo Go** (bez vlastného buildu, bez natívneho kódu) | Obmedzenie projektu; Expo Go podporuje len najnovšie SDK. |
| **Lokálne dáta v SQLite, fotky v súborovom systéme telefónu** | Žiadny backend ani prihlasovanie; súkromie používateľa. |
| **Sumy v centoch (celé čísla)** | Vyhnúť sa chybám pri práci s desatinnými číslami. |
| **Verzované migrácie schémy** (`PRAGMA user_version`) | Bezpečná zmena databázy pri nových funkciách. |
| **Prístup k eKasa za jedným rozhraním** (`src/services/ekasa.ts`) | Neoficiálne API sa môže zmeniť; dá sa vymeniť alebo vypnúť. |
| **Vždy záložný postup pri skenovaní** | Pri výpadku siete alebo neznámom QR sa otvorí ručný formulár. |
| **Vlastný generátor XML overený voči XSD** | Pohoda odmietne nesprávny formát; validácia znižuje riziko. |
| **Zdieľanie cez EAS Update, nie EAS Build** | Zachováva pravidlo „všetko v Expo Go“; nahráva sa len kód. |

## 7. Epicy iniciatívy

| ID | Epic | Stav |
| --- | --- | --- |
| EP-1 | Evidencia dokladov | Hotové |
| EP-2 | Skenovanie QR kódu eKasa | Hotové |
| EP-3 | Kategórie a automatické zaraďovanie | Hotové |
| EP-4 | Firmy a číslovanie dokladov | Hotové |
| EP-5 | DPH a sumy | Hotové |
| EP-6 | Prehľady | Hotové |
| EP-7 | Export do Pohody | Hotové (import do reálnej Pohody čaká na overenie) |
| EP-8 | Záloha a obnova dát | Hotové |
| EP-9 | Používateľský zážitok a spoľahlivosť | Hotové |
| EP-10 | Distribúcia a dokumentácia | Hotové |

Podrobnosti sú v [EPICS.md](EPICS.md), jednotlivé požiadavky v [USER_STORIES.md](USER_STORIES.md).

## 8. Postup realizácie

Vývoj prebiehal po fázach; po každej fáze nasledovalo vysvetlenie a otestovanie na iPhone.

| Fáza | Obsah |
| --- | --- |
| 0 | Založenie projektu (TypeScript, Expo Router), taby s prázdnymi obrazovkami |
| 1 | Databáza, ručné pridanie dokladu s fotkou, zoznam, detail, úprava, zmazanie |
| 2 | Kategórie, ich správa, zapamätanie kategórie pre obchod, filtre v zozname |
| 3 | Skenovanie QR eKasa, dopyt na API, záložný postup |
| 4 | Mesačný prehľad s grafom (neskôr doplnený ročný prehľad) |
| 5 | Export do Pohody v XML (pôvodne plánovaný PDF export bol nahradený) |
| 6 | Doladenie: blesk, haptika, prázdne stavy, chybové hlášky, vzhľad |
| Doplnky | Interné číslovanie, číslo dokladu, DPH po sadzbách, viac firiem, predkontácia kategórie, záloha a obnova dát, zdieľanie cez EAS Update |

## 9. Riziká a závislosti

| Riziko / závislosť | Dopad | Opatrenie / stav |
| --- | --- | --- |
| **eKasa API je neoficiálne** (používa ho aj webová overovacia služba) a môže sa zmeniť alebo obmedziť počet dopytov | Nefunguje automatické predvyplnenie | Rozhranie je izolované v `ekasa.ts`; vždy funguje ručné zadanie. |
| **Import do Pohody nebol overený v reálnej Pohode** | Pohoda môže doklad odmietnuť (číselný rad, pokladňa, predkontácia) | XML je validné voči XSD; zostáva overiť reálnym importom a podľa chyby doladiť. |
| **Expo Go podporuje len najnovšie SDK** | Po vydaní nového SDK sa appka v aktualizovanom Expo Go neotvorí | Treba presunúť projekt na novšie SDK a znova publikovať. |
| **Dáta sú len v telefóne (viazané na Expo Go)** | Pri odinštalovaní Expo Go sa stratia | Záloha a obnova dát v Nastaveniach; zálohu treba robiť pravidelne. |
| **Záloha nie je šifrovaná** | Citlivé údaje v súbore zálohy | Používateľ ho ukladá na bezpečné miesto; upozornenie je v appke. |
| **Poradie dátumu v offline QR** nie je v zdrojoch jednoznačné | Možný nesprávny dátum pri offline bločku | Dátum je vo formulári viditeľný a dá sa opraviť. |
| **Zdieľanie len cez členov organizácie na expo.dev** | Appku otvoria len pozvaní ľudia | Pozvánky do organizácie `mn1chos-team`. |

## 10. Definícia hotového (Definition of Done)

- Funkcia je implementovaná, prechádza kontrolou typov (`tsc`) a zostavením balíka.
- Funkcia je otestovaná na iPhone v Expo Go (Michalom).
- Texty v UI sú po slovensky, sumy `12,50 €`, dátumy `3. 10. 2026`.
- Chyby (sieť, súbory, databáza) sú ošetrené a aplikácia nespadne.
- Kód a komentáre sú zrozumiteľné; README je aktualizované.

## 11. Stav a otvorené položky

- Všetky epicy sú dodané a používateľom odskúšané na iPhone.
- **Otvorené:** reálny import XML do Pohody, overenie offline QR dátumu na skutočnom offline bločku.
- **Nerealizované nápady** (mimo dohodnutého rozsahu): hľadanie v dokladoch, hromadné mazanie, tmavý režim, presun dokladu medzi firmami, uloženie celej odpovede eKasa, publikovanie v App Store.
