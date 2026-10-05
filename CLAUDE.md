# InvoSpace – inštrukcie pre Claude Code

Tento súbor je hlavný kontext pre vývoj aplikácie. Prečítaj ho celý pred prvou zmenou v kóde a drž sa ho počas celého vývoja.

## 1. Kontext projektu

- **InvoSpace** je mobilná aplikácia na evidenciu dokladov (najmä blokov z pokladní) pre iPhone.
- Ide o **školský testovací projekt**. Vyučujúci schválil, že kód píše AI. Študent (Michal) ho však musí vedieť obhájiť, preto je zrozumiteľnosť kódu dôležitejšia než šikovnosť.
- Michal **ešte nerobil mobilnú aplikáciu**. Má IT administrátorské skúsenosti (Microsoft 365, Intune, Jamf), takže ladenie a terminál mu nie sú cudzie, ale React Native a TypeScript sú pre neho nové.
- Vývoj prebieha na **Windows notebooku bez Macu**. Testovanie prebieha na **fyzickom iPhone cez aplikáciu Expo Go**.
- Jazyk používateľského rozhrania: **slovenčina**. Mena: **EUR**.

## 2. Tvrdé technické obmedzenia

Tieto pravidlá majú prednosť pred všetkým ostatným:

1. **Všetko musí bežať v Expo Go.** (Zdieľanie s ďalšími ľuďmi sa robí cez EAS Update, ktorý nahráva len kód; EAS Build sa nepoužíva.) Nepoužívaj knižnice s vlastným natívnym kódom, ktoré nie sú súčasťou Expo Go. Žiadny development build, žiadny `expo prebuild`, žiadny EAS Build, žiadne úpravy natívnych priečinkov `ios/` alebo `android/`. Ak funkcia bez natívneho modulu nejde, povedz to a navrhni alternatívu.
2. **Použi najnovšie stabilné Expo SDK, ktoré podporuje aktuálna verzia Expo Go v App Store.** Expo Go podporuje iba jednu (najnovšiu) verziu SDK.
3. **Balíčky inštaluj cez `npx expo install <balík>`**, nie cez `npm install`, aby sa zvolili verzie kompatibilné so SDK.
4. **Over si aktuálne API v dokumentácii Expo** pred použitím modulu. API sa medzi verziami SDK menia (napríklad `expo-file-system` má nové API a staré je v `expo-file-system/legacy`). Nespoliehaj sa na zastarané príklady.
5. Príkazy píš pre **Windows (PowerShell)**.
6. **Žiadny backend, žiadne prihlasovanie, žiadna synchronizácia so serverom ani NAS.** Všetky dáta sú lokálne v telefóne.

## 3. Technologický stack

| Oblasť | Technológia |
| --- | --- |
| Jazyk | TypeScript (strict mode) |
| Framework | React Native + Expo (managed workflow) |
| Navigácia | Expo Router (taby + stack) |
| Databáza | `expo-sqlite` |
| Súbory (fotky dokladov) | `expo-file-system` |
| Kamera a QR kódy | `expo-camera` (`CameraView` so skenovaním QR) |
| Import z galérie | `expo-image-picker` |
| Export do Pohody | XML generované vlastným kódom (`src/services/pohoda.ts`), súbor cez `expo-file-system` |
| Zdieľanie súborov | `expo-sharing` |
| Haptická odozva | `expo-haptics` |
| Grafy | `react-native-svg` (vlastný jednoduchý stĺpcový graf) alebo knižnica nad ním, ktorá je kompatibilná s Expo Go |

Nepridávaj state management knižnice (Redux, Zustand a pod.), ak to nie je nevyhnutné. Stačí React state, kontext a vlastné hooky.

## 4. Funkcionalita

1. **Pridanie dokladu** – odfotenie bločku kamerou alebo výber z galérie, zadanie sumy, dátumu, obchodu, kategórie a voliteľnej poznámky.
2. **Skenovanie QR kódu eKasa** – načítanie QR kódu zo slovenského bločku a predvyplnenie údajov (pozri sekciu 7).
3. **Zoznam dokladov** – zoradený od najnovších, filter podľa mesiaca a kategórie, súčet za zobrazený výber.
4. **Detail dokladu** – fotka (s možnosťou zväčšenia), údaje, úprava, zmazanie s potvrdením.
5. **Kategórie** – predvolené: Benzín, Potraviny, Domácnosť, Reštaurácie, Zdravie, Ostatné. Používateľ môže pridávať, premenovať a mazať vlastné. Aplikácia si zapamätá kategóriu pre obchod (podľa IČO, prípadne názvu) a pri ďalšom doklade z rovnakého obchodu ju predvyplní.
6. **Mesačný prehľad** – celková suma za mesiac, súčty podľa kategórií, stĺpcový graf, prepínanie mesiacov.
7. **Export do Pohody (XML)** – jediný finálny export: jeden XML súbor za zvolený mesiac určený na import do účtovného programu Pohoda. Obsahuje len údaje dokladov (bez fotiek). Zdieľanie cez systémové menu (OneDrive, e-mail, Súbory). PDF export sa **nerobí** (rozhodnutie zadávateľa). Podrobnosti v sekcii 8.
8. **Drobnosti** – prisvietenie bleskom pri skenovaní, haptická odozva po úspešnom naskenovaní, prázdne stavy („Zatiaľ nemáš žiadne doklady“).

9. **Záloha dát (doplnené na žiadosť zadávateľa)** – v Nastaveniach tlačidlo, ktoré vytvorí jeden ZIP (`data.json` + fotky v `photos/`) a ponúkne ho na zdieľanie. Súčasťou je aj obnovenie zo zálohy (nahradí všetky dáta v telefóne; najprv sa záloha overí, výmena dát prebehne v jednej transakcii).

**Mimo rozsahu:** OCR rozpoznávanie textu, Face ID, synchronizácia, cloud, prihlasovanie, viac mien, Android-špecifické úpravy (aplikácia môže na Androide fungovať, ale netestuje sa).

## 5. Dátový model

Sumy ukladaj ako **celé čísla v centoch** (`amount_cents`), nikdy nie ako desatinné čísla. Dátumy ukladaj ako ISO 8601 reťazce.

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_date TEXT NOT NULL,      -- dátum nákupu
  amount_cents INTEGER NOT NULL,
  merchant_name TEXT,
  merchant_ico TEXT,
  category_id INTEGER REFERENCES categories(id),
  image_uri TEXT,                   -- trvalá cesta v priečinku dokumentov aplikácie
  ekasa_receipt_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('manual', 'qr')),
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE merchant_categories (
  merchant_key TEXT PRIMARY KEY,    -- IČO, ak chýba tak normalizovaný názov obchodu
  category_id INTEGER NOT NULL REFERENCES categories(id)
);
```

Pri zmazaní kategórie presuň jej doklady do kategórie „Ostatné“. Schému verzuj jednoduchými migráciami (napr. `PRAGMA user_version`).

**Neskôr pridané (na žiadosť zadávateľa), presné stĺpce sú v `src/db/database.ts`:** `receipts.internal_number` (interné číslo, jedinečné), `receipts.receipt_number` (číslo dokladu z bločku), `receipts.amount_net_cents` (suma bez DPH), `receipts.company_id`, tabuľka `companies` (firmy: názov, IČO, nastavenia exportu do Pohody, predpona a počítadlo interného čísla), tabuľka `receipt_vat` (rozpis DPH po sadzbách) a tabuľka `settings` (zvolená firma). Bločky patria vždy jednej firme; kategórie sú spoločné.

**Fotky:** obrázok z kamery alebo galérie je v dočasnom priečinku. Vždy ho skopíruj do trvalého priečinka dokumentov aplikácie a do databázy ulož túto cestu. Pri zmazaní dokladu zmaž aj súbor.

## 6. Štruktúra projektu

```
app/                      # Expo Router obrazovky
  (tabs)/
    index.tsx             # Doklady – zoznam
    scan.tsx              # Skenovať – QR / fotka
    report.tsx            # Prehľad – mesačný report
    settings.tsx          # Nastavenia – kategórie, export
  receipt/[id].tsx        # detail dokladu
  receipt/edit.tsx        # pridanie / úprava dokladu
src/
  db/                     # pripojenie, migrácie, dotazy
  services/
    ekasa.ts              # parsovanie QR a dopyt na eKasa
    pohoda.ts             # generovanie XML pre import do Pohody
    categorize.ts         # zapamätanie a návrh kategórie
    files.ts              # práca s fotkami
  components/             # znovupoužiteľné UI komponenty
  hooks/
  types/
  utils/                  # formátovanie sumy, dátumu
```

## 7. eKasa (slovenské bločky)

- Bločky z registračných pokladníc eKasa majú QR kód. **Online doklad** obsahuje identifikátor dokladu (začína typicky písmenom `O-`). **Offline doklad** obsahuje údaje oddelené dvojbodkami (OKP, kód pokladnice, dátum a čas, poradové číslo, suma).
- Finančná správa poskytuje verejné vyhľadanie dokladu podľa identifikátora. **Pred implementáciou si over aktuálnu adresu a formát API** (doteraz známy endpoint je `POST https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find` s telom `{"receiptId": "..."}`) a skontroluj, že odpoveď obsahuje sumu, dátum, názov a IČO obchodu.
- Implementuj to za rozhraním v `src/services/ekasa.ts`, aby sa dalo ľahko vymeniť alebo vypnúť.
- **Vždy musí fungovať záložný postup:** pri offline QR vyčítaj sumu a dátum priamo z kódu; pri chybe siete, neznámom formáte alebo nedostupnom API zobraz zrozumiteľnú hlášku a otvor formulár na ručné doplnenie s tým, čo sa podarilo získať.
- Nastav timeout na sieťový dopyt (cca 10 s).

## 8. Export do Pohody (XML)

- Formát: Pohoda XML `dataPack` verzia 2.0, schémy Stormware (`data.xsd`, `voucher.xsd`, `type.xsd`, https://www.stormware.sk/xml). Každý doklad je výdavkový pokladničný doklad (`voucher`, `voucherType = expense`).
- Rozhodnutia zadávateľa: platca DPH s rozpisom po sadzbách (jedna položka na sadzbu: základ a DPH), interné číslo (napr. PD1) ide ako požadované číslo dokladu (`numberRequested`), exportuje sa celý zvolený mesiac.
- Číslo dokladu z bločku ide do `originalDocument`, dodávateľ a IČO do `partnerIdentity`, sadzby 23/19/5 % (do 2024 20/10 %) sa mapujú na `high`/`low`/`third`.
- Nastavenia exportu (IČO, skratka pokladne, predkontácia) sa zadávajú raz pri firme (tabuľka `companies`); pri exporte sa nepýtajú. Export sa robí vždy za jednu firmu.
- Súbor je čisté ASCII (diakritika ako `&#x…;`), deklarovaný ako Windows-1250 ako vo vzorových súboroch Stormware. Názov súboru: `InvoSpace_2026-10.xml`. `id` balíka je stále `InvoSpace_<mesiac>`, aby Pohoda pri opakovanom importe nezdvojila doklady.
- Predkontácia kategórie: každá kategória môže mať vlastnú (`categories.pohoda_accounting`); ide do poľa Text dokladu (`voucherHeader/text`) na filtrovanie v Pohode, **nie** do položky dokladu. Ak ju kategória nemá, Text je popis dokladu. Predkontácia firmy je skutočná predkontácia v hlavičke (`voucherHeader/accounting`).
- Fotky sa neexportujú. Generátor musí prejsť validáciou voči oficiálnym XSD schémam (pri zmene ho znova over).

## 9. Postup vývoja po fázach

Pracuj **po jednej fáze**. Po každej fáze sa zastav a:
1. stručne vysvetli, čo si spravil a ako to funguje (po slovensky, zrozumiteľne pre začiatočníka),
2. napíš, čo má Michal otestovať na iPhone,
3. počkaj na jeho potvrdenie pred pokračovaním.

| Fáza | Obsah | Hotovo, keď |
| --- | --- | --- |
| 0 | Založenie projektu (TypeScript, Expo Router), taby s prázdnymi obrazovkami, návod na spustenie | Aplikácia sa otvorí v Expo Go na iPhone a dá sa prepínať medzi tabmi |
| 1 | Databáza, ručné pridanie dokladu s fotkou, zoznam, detail, úprava, zmazanie | Doklad sa dá pridať, po reštarte aplikácie tam stále je aj s fotkou |
| 2 | Kategórie, ich správa, zapamätanie kategórie pre obchod, filtre v zozname | Pri druhom doklade z rovnakého obchodu sa kategória predvyplní |
| 3 | Skenovanie QR eKasa, dopyt na API, záložný postup | Reálny bloček sa naskenuje a údaje sa predvyplnia; bez internetu sa otvorí ručný formulár |
| 4 | Mesačný prehľad s grafom | Súčty sedia s dokladmi v zozname pre daný mesiac |
| 5 | Export mesačného XML pre Pohodu a zdieľanie | XML sa dá uložiť/zdieľať a importovať do Pohody bez chyby |
| 6 | Doladenie: blesk, haptika, prázdne stavy, chybové hlášky, vzhľad | Aplikácia pôsobí dokončene pri prezentácii |

## 10. Pravidlá pre kód

- Identifikátory (premenné, funkcie, súbory) **po anglicky**. Komentáre **po slovensky** a tam, kde vysvetľujú *prečo*, nie *čo*.
- Malé, čitateľné komponenty a funkcie. Žiadne zbytočné abstrakcie.
- Databázové dotazy iba v `src/db/`, nie priamo v obrazovkách.
- Všetky texty v UI po slovensky. Sumu formátuj ako `12,50 €`, dátum ako `3. 10. 2026`.
- Pýtaj povolenia (kamera, galéria) až v momente, keď sú potrebné, a ošetri odmietnutie s vysvetlením a odkazom do nastavení.
- Ošetri chyby (sieť, súbory, databáza) tak, aby aplikácia nespadla a používateľ dostal zrozumiteľnú hlášku.
- Nepridávaj funkcie mimo tohto dokumentu bez opýtania.

## 11. Spustenie a testovanie

- Spustenie: `npx expo start`. Michal naskenuje QR kód z terminálu kamerou iPhonu a aplikácia sa otvorí v Expo Go.
- Notebook a iPhone musia byť v rovnakej Wi-Fi. Ak sa nevedia spojiť (firemná sieť, firewall), použi `npx expo start --tunnel`.
- Pri chybe požiadaj Michala o presné znenie chyby z terminálu alebo screenshot z telefónu.
- Ak meníš niečo, čo vyžaduje reštart (nový balík, konfigurácia), výslovne to povedz.

## 12. Dokumentácia pre obhajobu

Priebežne udržuj súbor `README.md` po slovensky: popis aplikácie, použité technológie, štruktúra projektu, dátový model a návod na spustenie. Ku každej fáze doplň krátku poznámku, čo pribudlo.
