# SPEC – Špecifikácia požiadaviek InvoSpace

> Tento dokument opisuje **ČO** aplikácia robí a čo úmyselne nerobí. **AKO** je to postavené, je v [DESIGN.md](DESIGN.md). **Kedy je hotovo**, určujú akceptačné kritériá v [docs/USER_STORIES.md](docs/USER_STORIES.md).

| | |
| --- | --- |
| **Aplikácia** | InvoSpace |
| **Verzia špecifikácie** | 1.0 |
| **Autor** | Michal Mateasik |
| **Dátum** | 19. 10. 2026 |
| **Súvisiace dokumenty** | [docs/INITIATIVE.md](docs/INITIATIVE.md), [docs/EPICS.md](docs/EPICS.md), [docs/USER_STORIES.md](docs/USER_STORIES.md), [DESIGN.md](DESIGN.md), [README.md](README.md) |

## 1. Problém

Pri bežných nákupoch firmy a ich zamestnanci dostávajú papierové bločky z registračných pokladníc eKasa. Bločky sa strácajú alebo blednú a ich údaje sa do účtovného programu prepisujú ručne, čo je zdĺhavé a chybové (suma, dátum, IČO dodávateľa, DPH po sadzbách). Ten istý človek často eviduje bločky pre viac firiem a doklady sa miešajú. Účtovník potrebuje doklady v číslovanom rade a s rozpisom DPH po sadzbách.

Cieľ: bloček zaevidovať za pár sekúnd, doklady držať oddelene podľa firiem a na konci mesiaca z nich jedným krokom pripraviť podklad pre účtovný program Pohoda.

## 2. Používatelia a roly

| Rola | Čo robí |
| --- | --- |
| **Používateľ** | Jediná rola v aplikácii. Eviduje bločky pre jednu alebo viac firiem, pozerá prehľady, robí export a zálohu. Aplikácia nemá prihlasovanie; každý používateľ má vlastné dáta vo svojom telefóne. |
| **Účtovník** | Nepracuje v aplikácii. Dostane XML súbor od používateľa a naimportuje ho do Pohody. |
| **Autor / správca** | Nepracuje s dátami používateľov. Publikuje nové verzie aplikácie a pozýva ľudí, ktorým sa aplikácia zdieľa. |

## 3. Funkcie

Každá funkcia je jedna veta z pohľadu používateľa. Kritériá hotovosti sú v zátvorke odkazom na príbehy v [docs/USER_STORIES.md](docs/USER_STORIES.md).

### 1 Evidencia dokladov
- **1.1** Používateľ môže zaevidovať doklad zadaním sumy, dátumu nákupu, dodávateľa, kategórie a poznámky. (US-01)
- **1.2** Používateľ môže k dokladu pridať fotku z kamery alebo z galérie. (US-02, US-03)
- **1.3** Používateľ vidí zoznam svojich dokladov od najnovších. (US-04)
- **1.4** Používateľ môže zoznam filtrovať podľa mesiaca a kategórie a vidí súčet zobrazeného výberu. (US-05)
- **1.5** Používateľ môže otvoriť detail dokladu a zväčšiť jeho fotku. (US-06)
- **1.6** Používateľ môže doklad upraviť alebo zmazať. (US-07)

### 2 Skenovanie QR kódu eKasa
- **2.1** Používateľ môže naskenovať QR kód z bločku a údaje dokladu sa predvyplnia. (US-08)
- **2.2** Pri offline bločku sa z QR kódu predvyplní aspoň suma, dátum a číslo dokladu. (US-09)
- **2.3** Ak sa údaje nepodarí získať, používateľ ich môže doplniť ručne. (US-10)
- **2.4** Používateľa aplikácia upozorní, ak ten istý bloček už zaevidoval. (US-11)
- **2.5** Používateľ môže pri skenovaní zapnúť blesk a po úspešnom skene pocíti odozvu. (US-12, US-13, US-14)

### 3 Kategórie
- **3.1** Používateľ môže doklad zaradiť do jednej z predvolených kategórií (Benzín, Potraviny, Domácnosť, Reštaurácie, Zdravie, Ostatné). (US-15)
- **3.2** Používateľ môže pridávať, premenovať a mazať vlastné kategórie. (US-16)
- **3.3** Aplikácia si zapamätá kategóriu obchodu a pri ďalšom doklade z toho istého obchodu ju navrhne. (US-17)
- **3.4** Používateľ môže ku kategórii priradiť predkontáciu z Pohody. (US-31)

### 4 Firmy a číslovanie dokladov
- **4.1** Používateľ môže vytvoriť firmu s názvom, IČO a ďalšími údajmi a evidovať pod ňu doklady. (US-18)
- **4.2** Používateľ môže prepínať medzi firmami a aplikácia si zapamätá poslednú zvolenú. (US-19)
- **4.3** Používateľ môže údaje firmy upraviť a firmu bez dokladov zmazať. (US-20)
- **4.4** Každý doklad dostane automaticky interné číslo z číselného radu firmy, ktoré môže používateľ prepísať. (US-21)
- **4.5** Používateľ môže pre každú firmu nastaviť predponu a začiatok číslovania vrátane núl na začiatku. (US-22)
- **4.6** Používateľ môže k dokladu uviesť číslo dokladu z bločku. (US-23)

### 5 DPH a sumy
- **5.1** Doklad nesie sumu s DPH aj bez DPH. (US-24)
- **5.2** Doklad nesie rozpis DPH po sadzbách (základ a DPH za každú sadzbu). (US-25)
- **5.3** Aplikácia upozorní na doklady bez rozpisu DPH skôr, než sa exportujú. (US-26)

### 6 Prehľady
- **6.1** Používateľ vidí výdavky za mesiac: celkovú sumu, súčty podľa kategórií a graf. (US-27)
- **6.2** Používateľ vidí výdavky za celý rok vrátane rozpisu po mesiacoch. (US-28)

### 7 Export do účtovného programu
- **7.1** Používateľ môže vytvoriť jeden XML súbor s dokladmi firmy za zvolený mesiac na import do Pohody. (US-29)
- **7.2** Údaje potrebné pre Pohodu (IČO, pokladňa, predkontácia) používateľ zadá raz pri firme a pri exporte sa už nepýtajú. (US-30)
- **7.3** Používateľ môže vytvorený súbor odoslať cez systémové zdieľanie. (US-33)

### 8 Záloha a obnova
- **8.1** Používateľ môže všetky svoje dáta aj fotky zálohovať do jedného súboru. (US-35)
- **8.2** Používateľ môže dáta obnoviť zo zálohy, napríklad v novom telefóne. (US-36)

### 9 Spoľahlivosť a zrozumiteľnosť
- **9.1** Prázdne obrazovky povedia používateľovi, čo má urobiť ďalej. (US-37)
- **9.2** Pri chybe aplikácia nespadne a povie používateľovi, čo sa stalo. (US-38)
- **9.3** Rozhranie je po slovensky; sumy aj dátumy sú v slovenských tvaroch. (US-39)

## 4. Obmedzenia

- Aplikácia je určená pre **iPhone** a spúšťa sa v aplikácii **Expo Go**. Bez vlastného buildu, bez natívneho kódu.
- **Všetky dáta sú lokálne v telefóne.** Žiadny server, cloud, synchronizácia ani prihlasovanie.
- Jazyk rozhrania je **slovenčina**, mena **EUR**.
- Vývoj prebieha na Windows bez Macu.
- Údaje z bločkov sa získavajú z **verejného vyhľadávania eKasa Finančnej správy**, ktoré nie je oficiálne zaručené a môže sa zmeniť alebo obmedziť. Aplikácia musí vždy fungovať aj bez neho (ručné zadanie).
- Dopyt na eKasa má časový limit približne 10 sekúnd.
- Export musí zodpovedať formátu importu Pohody (STORMWARE), schéma verzia 2.
- Povolenia (kamera) sa pýtajú až v momente, keď sú potrebné.
- Expo Go podporuje vždy len najnovšie SDK, preto aplikácia beží na SDK 57 a po vydaní nového SDK sa musí presunúť.
- Zdieľať aplikáciu s ďalšími ľuďmi možno len cez EAS Update (nahráva sa len kód) a len členom organizácie na expo.dev.

## 5. Mimo rozsahu

Vo verzii 1 úmyselne **nie**:

- rozpoznávanie textu z fotky (OCR),
- Face ID a iná biometria,
- synchronizácia, cloud, server, prihlasovanie používateľov,
- viac mien,
- PDF export (nahradený exportom pre Pohodu na žiadosť zadávateľa),
- export fotiek,
- ukladanie celej odpovede eKasa (položky bločku, podpisové kódy),
- ručný rozpis viacerých sadzieb DPH na jednom ručne zadanom doklade,
- šifrovanie zálohy, automatická a cloudová záloha,
- hľadanie v dokladoch, hromadné mazanie, tmavý režim, presun dokladu medzi firmami,
- publikovanie v App Store, Android-špecifické úpravy.

## 6. Otvorené otázky a ich stav

| # | Otázka | Stav |
| --- | --- | --- |
| 1 | Prijme Pohoda vygenerovaný XML bez chyby (číselný rad s rovnakou predponou, skratka pokladne, predkontácia, Text dokladu)? | **Overené.** XML je validné voči schémam Stormware a reálny import do Pohody prebehol bez chyby (overil používateľ). |
| 2 | V akom poradí je v offline QR kóde zapísaný dátum (rrMMdd alebo ddMMrr)? | **Overené.** Oficiálne zdroje poradie jednoznačne neuvádzajú, preto aplikácia skúša oba tvary a berie reálny dátum; rozpoznanie dátumu overil používateľ na offline bločku. Dátum možno vo formulári aj opraviť. |
| 3 | Stačia údaje z eKasa alebo fotka bločku na zákonnú archiváciu dokladov? | **Otvorené.** Treba posúdiť s účtovníkom; aplikácia to netvrdí. |
| 4 | Čo má robiť export pri doklade bez rozpisu DPH? | **Rozhodnuté:** exportuje sa ako bez DPH po upozornení a potvrdení. |
| 5 | Je „duplicitný doklad“ aj ten istý bloček v inej firme? | **Rozhodnuté:** duplicita sa hľadá cez všetky firmy. |
| 6 | Čo je v Texte dokladu pre Pohodu, ak kategória nemá predkontáciu? | **Rozhodnuté:** popis dokladu („Bloček …“), lebo Pohoda Text vyžaduje. |
| 7 | Ako opraviť v Pohode doklad, ktorý sa po importe v aplikácii upravil? | **Otvorené.** Pohoda pri opakovanom importe rovnaké doklady preskočí; oprava sa robí v Pohode. |
| 8 | Má byť záloha šifrovaná? | **Otvorené.** Verzia 1 nešifruje a upozorňuje používateľa. |
| 9 | Ako dlho a ako udržiavať aplikáciu v Expo Go po vydaní nového SDK? | **Otvorené.** Treba presun na novšie SDK a nové publikovanie. |

## 7. Akceptačné kritériá

Kedy je hotovo, určujú akceptačné kritériá pri jednotlivých príbehoch v [docs/USER_STORIES.md](docs/USER_STORIES.md). Podľa nich sa výsledok **overuje**, nie podľa dojmu. Základné skúšky pre každú skupinu funkcií:

| Skupina | Hotovo, keď |
| --- | --- |
| 1 Evidencia | Doklad sa dá pridať a po reštarte aplikácie tam je aj s fotkou. |
| 2 eKasa | Reálny bloček sa naskenuje a údaje sa predvyplnia; bez internetu sa otvorí ručný formulár. |
| 3 Kategórie | Pri druhom doklade z rovnakého obchodu sa kategória predvyplní. |
| 4 Firmy a číslovanie | Doklady každej firmy sú oddelené a každá firma má vlastný číselný rad. |
| 5 DPH | Súčet základov a DPH sa rovná sume s DPH. |
| 6 Prehľady | Súčty sedia s dokladmi v zozname pre dané obdobie. |
| 7 Export | XML je platné voči schémam Stormware a naimportuje sa do Pohody bez chyby. |
| 8 Záloha | Po obnove sú doklady aj fotky v pôvodnom stave; poškodená záloha dáta nezmení. |
| 9 Spoľahlivosť | Aplikácia pri chybe nespadne a pôsobí dokončene pri prezentácii. |
