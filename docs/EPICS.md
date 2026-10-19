# EPICs – InvoSpace

Epicy iniciatívy [INIT-1](INITIATIVE.md). Používateľské príbehy každého epicu sú v [USER_STORIES.md](USER_STORIES.md).

## Prehľad

| ID | Epic | Stories | Priorita | Stav |
| --- | --- | --- | --- | --- |
| EP-1 | Evidencia dokladov | US-01 až US-07 | Must | Hotové |
| EP-2 | Skenovanie QR kódu eKasa | US-08 až US-14 | Must | Hotové |
| EP-3 | Kategórie a automatické zaraďovanie | US-15 až US-17 | Must | Hotové |
| EP-4 | Firmy a číslovanie dokladov | US-18 až US-23 | Must | Hotové |
| EP-5 | DPH a sumy | US-24 až US-26 | Must | Hotové |
| EP-6 | Prehľady | US-27 až US-28 | Should | Hotové |
| EP-7 | Export do Pohody | US-29 až US-34 | Must | Hotové (reálny import čaká na overenie) |
| EP-8 | Záloha a obnova dát | US-35 až US-36 | Should | Hotové |
| EP-9 | Používateľský zážitok a spoľahlivosť | US-37 až US-40 | Should | Hotové |
| EP-10 | Distribúcia a dokumentácia | US-41 až US-42 | Could | Hotové |

Priorita je podľa MoSCoW (Must / Should / Could).

---

## EP-1 – Evidencia dokladov

**Popis:** Používateľ vie zaevidovať doklad (bloček) s fotkou a základnými údajmi, nájsť ho v zozname, zobraziť, upraviť a zmazať. Údaje aj fotky zostávajú trvalo v telefóne.

**Hodnota:** Základ aplikácie; nahrádza papierové bločky, ktoré sa strácajú.

**V rozsahu:** ručné zadanie (suma, dátum, dodávateľ, kategória, poznámka), fotka z kamery alebo galérie, zoznam od najnovších, filter podľa mesiaca a kategórie so súčtom, detail so zväčšením fotky, úprava, zmazanie s potvrdením.

**Mimo rozsahu:** rozpoznávanie textu z fotky (OCR).

**Kritériá dokončenia:**
- Doklad sa dá pridať a po reštarte aplikácie tam stále je aj s fotkou.
- Fotka sa kopíruje do trvalého priečinka aplikácie a pri zmazaní dokladu sa zmaže aj súbor.
- Sumy sa ukladajú v centoch, dátumy ako ISO reťazce.

**Súvisiace stories:** US-01, US-02, US-03, US-04, US-05, US-06, US-07

**Závislosti:** žiadne (základný epic).

---

## EP-2 – Skenovanie QR kódu eKasa

**Popis:** Naskenovaním QR kódu z bločku sa údaje predvyplnia z verejného vyhľadávania Finančnej správy. Ak to nejde (offline doklad, chyba siete, neznámy formát), vždy ostáva záložný postup.

**Hodnota:** Odstraňuje ručné prepisovanie a chyby v sume, dátume a IČO.

**V rozsahu:** online aj offline QR, dopyt na API s timeoutom 10 s, záložný postup, odhalenie duplicitného skenu, blesk kamery, haptická odozva, povolenie kamery až pri použití.

**Mimo rozsahu:** ukladanie celej odpovede eKasa (položky bločku, podpisové kódy).

**Kritériá dokončenia:**
- Reálny online bloček sa naskenuje a údaje sa predvyplnia.
- Bez internetu alebo pri neznámom QR sa otvorí formulár na ručné doplnenie s tým, čo sa podarilo získať.
- Tá istá hodnota sa nedá omylom uložiť dvakrát.

**Súvisiace stories:** US-08, US-09, US-10, US-11, US-12, US-13, US-14

**Závislosti:** EP-1; externé API Finančnej správy (neoficiálne).

---

## EP-3 – Kategórie a automatické zaraďovanie

**Popis:** Doklady sa zaraďujú do kategórií (predvolené aj vlastné). Aplikácia si pamätá kategóriu pre obchod a pri ďalšom doklade z rovnakého obchodu ju predvyplní.

**Hodnota:** Prehľad výdavkov podľa druhu a menej klikania pri opakovaných nákupoch.

**V rozsahu:** predvolené kategórie (Benzín, Potraviny, Domácnosť, Reštaurácie, Zdravie, Ostatné), pridanie, premenovanie a zmazanie vlastných, presun dokladov do „Ostatné“ pri zmazaní kategórie, zapamätanie podľa IČO alebo názvu obchodu.

**Kritériá dokončenia:** Pri druhom doklade z rovnakého obchodu sa kategória predvyplní.

**Súvisiace stories:** US-15, US-16, US-17

**Závislosti:** EP-1.

---

## EP-4 – Firmy a číslovanie dokladov

**Popis:** Bločky sa evidujú pod vybranou firmou. Každá firma má vlastné údaje (názov, IČO a ďalšie), nastavenia exportu do Pohody a vlastné číslovanie dokladov s predponou a počítadlom (napr. `26/V-001`).

**Hodnota:** Oddelená evidencia viacerých firiem a doklady v číslovanom rade, ako ich potrebuje účtovník.

**V rozsahu:** vytvorenie, úprava a zmazanie firmy (len bez dokladov), výber a zapamätanie aktívnej firmy, automatické interné číslo s možnosťou prepísať (jedinečné v rámci firmy, zachovanie núl), číslo dokladu z bločku.

**Kritériá dokončenia:**
- Zoznam, prehľad aj export zobrazujú len doklady aktívnej firmy.
- Rovnaké interné číslo môže mať iná firma, v tej istej firme nie.

**Súvisiace stories:** US-18, US-19, US-20, US-21, US-22, US-23

**Závislosti:** EP-1.

---

## EP-5 – DPH a sumy

**Popis:** Doklad nesie sumu s DPH, sumu bez DPH a rozpis DPH po sadzbách (základ a DPH za každú sadzbu).

**Hodnota:** Účtovník dostane správny rozpis DPH, bez ručného dopočítavania.

**V rozsahu:** načítanie rozpisu z eKasa, výber sadzby pri ručnom doklade podľa dátumu nákupu (od 2025: 23 / 19 / 5 %, predtým 20 / 10 %), dopočítanie základu a DPH, kontrola súčtov, upozornenie na doklady bez rozpisu.

**Mimo rozsahu:** ručný rozpis viacerých sadzieb na jednom ručne zadanom doklade (viac sadzieb vie len doklad z eKasa).

**Kritériá dokončenia:** Súčet základov a DPH sa rovná sume s DPH.

**Súvisiace stories:** US-24, US-25, US-26

**Závislosti:** EP-1, EP-2.

---

## EP-6 – Prehľady

**Popis:** Mesačný a ročný prehľad výdavkov s grafmi.

**Hodnota:** Rýchly obraz o tom, koľko a na čo sa minulo.

**V rozsahu:** celková suma a počet dokladov, súčty a podiely podľa kategórií, stĺpcový graf (vlastný, cez `react-native-svg`), prepínanie mesiacov a rokov, graf po mesiacoch v ročnom pohľade.

**Kritériá dokončenia:** Súčty sedia s dokladmi v zozname pre dané obdobie.

**Súvisiace stories:** US-27, US-28

**Závislosti:** EP-1, EP-3, EP-4.

---

## EP-7 – Export do Pohody

**Popis:** Jeden XML súbor za zvolený mesiac s údajmi dokladov (bez fotiek) na import do účtovného programu Pohoda. Doklady sa exportujú ako výdavkové pokladničné doklady.

**Hodnota:** Odstraňuje prepisovanie dokladov do účtovníctva; hlavný „finálny“ výstup aplikácie.

**V rozsahu:** generovanie XML (dataPack 2.0), mapovanie polí (číslo, dodávateľ, IČO, dátum, položky s DPH po sadzbách), nastavenia exportu pri firme, predkontácia kategórie v texte dokladu, ochrana pred duplicitami pri opakovanom importe, zdieľanie cez systémové menu, upozornenia pred exportom.

**Mimo rozsahu:** PDF export, export fotiek.

**Kritériá dokončenia:**
- XML je platné voči oficiálnym schémam Stormware.
- XML sa dá naimportovať do Pohody bez chyby (**čaká na overenie v reálnej Pohode**).

**Súvisiace stories:** US-29, US-30, US-31, US-32, US-33, US-34

**Závislosti:** EP-4, EP-5; externý systém Pohoda (STORMWARE).

---

## EP-8 – Záloha a obnova dát

**Popis:** Používateľ si môže vytvoriť jeden súbor so všetkými dátami aj fotkami a neskôr z neho dáta obnoviť, napríklad v novom telefóne.

**Hodnota:** Dáta sú len v telefóne, preto je záloha poistkou proti strate.

**V rozsahu:** záloha do ZIP (`data.json` + `photos/`), zdieľanie zálohy, dátum poslednej zálohy, obnova zo zálohy s overením a transakčnou výmenou dát.

**Mimo rozsahu:** šifrovanie zálohy, automatická záloha, cloudová záloha.

**Kritériá dokončenia:**
- Po obnove sú doklady aj fotky v pôvodnom stave.
- Poškodená alebo cudzia záloha sa odmietne a pôvodné dáta ostanú nezmenené.

**Súvisiace stories:** US-35, US-36

**Závislosti:** EP-1, EP-4.

---

## EP-9 – Používateľský zážitok a spoľahlivosť

**Popis:** Aplikácia pôsobí dokončene a nepadá: prázdne stavy, zrozumiteľné chyby, jednotný vzhľad, slovenské formáty, vlastná ikona.

**Hodnota:** Dôveryhodná aplikácia a dobrý dojem pri prezentácii.

**V rozsahu:** prázdne stavy s radou, chybové stavy s opakovaním, globálna poistka proti pádu, slovenčina a formáty (`12,50 €`, `3. 10. 2026`), ikona a úvodná obrazovka.

**Kritériá dokončenia:** Aplikácia pôsobí dokončene pri prezentácii.

**Súvisiace stories:** US-37, US-38, US-39, US-40

---

## EP-10 – Distribúcia a dokumentácia

**Popis:** Aplikáciu je možné ukázať vybraným ľuďom a projekt je zdokumentovaný.

**V rozsahu:** zdieľanie cez Expo Go a EAS Update (pre členov organizácie na expo.dev), README, CLAUDE.md, agilné dokumenty (INITIATIVE, EPICS, USER STORIES), repozitár na GitHube.

**Mimo rozsahu:** publikovanie v App Store.

**Súvisiace stories:** US-41, US-42

**Obmedzenie:** Expo Go podporuje len najnovšie SDK; po vydaní nového SDK treba projekt presunúť.
