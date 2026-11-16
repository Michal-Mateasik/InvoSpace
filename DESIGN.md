# DESIGN – Design dokument InvoSpace

> Tento dokument opisuje **AKO** je aplikácia postavená: architektúru, dátový model, rozhrania a štruktúru kódu. **ČO** aplikácia robí, je v [SPEC.md](SPEC.md), **kedy je hotovo**, v [docs/USER_STORIES.md](docs/USER_STORIES.md).

| | |
| --- | --- |
| **Aplikácia** | InvoSpace |
| **Verzia dokumentu** | 1.0 (zodpovedá stavu kódu po fáze 6 a doplnkoch) |
| **Autor** | Michal Mateasik |
| **Dátum** | 19. 10. 2026 |

## 1. Prehľad architektúry

Aplikácia je len klient bežiaci v telefóne. Nemá vlastný server ani autentifikáciu. Jediná sieťová komunikácia je dopyt na verejné vyhľadávanie eKasa pri skenovaní QR kódu.

```
┌─────────────────────────────────────────────────────────────┐
│ app/            Obrazovky (Expo Router): UI a obsluha akcií │
├─────────────────────────────────────────────────────────────┤
│ src/context     Aktívna firma (React kontext)               │
│ src/hooks       Načítanie dát pri zobrazení obrazovky       │
│ src/components  Znovupoužiteľné UI komponenty               │
├─────────────────────────────────────────────────────────────┤
│ src/services    Logika nad dátami a svetom von:             │
│                 eKasa, Pohoda XML, záloha, obnova, fotky,   │
│                 návrh kategórie                             │
├─────────────────────────────────────────────────────────────┤
│ src/db          Jediné miesto so SQL (expo-sqlite)          │
│ src/utils       Čisté funkcie (formáty, DPH, číslovanie,    │
│                 ZIP) bez závislosti na telefóne             │
└─────────────────────────────────────────────────────────────┘
   Zariadenie: SQLite databáza, súborový systém, kamera,
   knižnica fotiek, zdieľanie, vibrácie
   Externe:    eKasa (len dopyt), Pohoda (len súbor, bez spojenia)
```

**Zásady, ktoré architektúra dodržiava**
- SQL sa píše **len v `src/db/`**; obrazovky volajú funkcie z tejto vrstvy.
- Logika bez závislosti na telefóne (DPH, číslovanie, ZIP, parsovanie QR, generovanie XML) je v čistých funkciách, aby sa dala overiť mimo telefónu.
- Zmena externého rozhrania (eKasa, Pohoda) sa robí na jednom mieste (`ekasa.ts`, `pohoda.ts`).
- Žiadna knižnica na správu stavu; stav drží React (state, kontext, vlastný hook).

## 2. Technológie

| Oblasť | Voľba | Verzia |
| --- | --- | --- |
| Jazyk | TypeScript, strict | ~6.0 |
| Framework | React Native + Expo (managed, Expo Go) | Expo SDK 58, React Native 0.88, React 19.3 |
| Navigácia | Expo Router (taby + stack, typované trasy) | ~58 |
| Databáza | `expo-sqlite` | ~58 |
| Súbory | `expo-file-system` (nové API `File`, `Directory`, `Paths`) | ~58 |
| Kamera, QR, blesk | `expo-camera` (`CameraView`) | ~58 |
| Fotka z kamery / galérie | `expo-image-picker` | ~58 |
| Dátum | `@react-native-community/datetimepicker` | 9.2 |
| Zdieľanie | `expo-sharing` | ~58 |
| Vibrácie | `expo-haptics` | ~58 |
| Grafy | `react-native-svg` (vlastný stĺpcový graf) | 15 |
| Aktualizácie pre zdieľanie | `expo-updates` (EAS Update) | ~58 |

Všetky balíky sú súčasťou Expo Go, takže nie je potrebný vlastný build. Balíky sa inštalujú cez `npx expo install`, aby verzie sedeli so SDK.

## 3. Štruktúra kódu

```
app/                         Obrazovky (súbor = adresa)
  _layout.tsx                Koreň: CompanyProvider, stack, poistka proti pádu
  (tabs)/_layout.tsx         Spodná lišta; presmerovanie na výber firmy, ak žiadna nie je
  (tabs)/index.tsx           Doklady – zoznam s filtrami
  (tabs)/scan.tsx            Skenovať QR, blesk, haptika
  (tabs)/report.tsx          Prehľad: mesiac / rok
  (tabs)/settings.tsx        Firma, kategórie, záloha a obnova, odkaz na export
  receipt/[id].tsx           Detail dokladu
  receipt/edit.tsx           Pridanie a úprava dokladu
  companies.tsx              Výber firmy
  company/edit.tsx           Pridanie a úprava firmy
  export.tsx                 Export do Pohody
src/
  context/CompanyContext.tsx Zoznam firiem a aktívna firma
  hooks/useLoadOnFocus.ts    Načítanie dát pri zobrazení obrazovky, reload, chyba
  components/                Button, FilterChips, CategoryChips, ReceiptListItem,
                             ReceiptPhotoField, BarChart, CompanyBar, StateViews
  db/                        database.ts (pripojenie, migrácie), companies, receipts,
                             categories, merchantCategories, numbering, vat, reports,
                             backup
  services/                  ekasa, pohoda, categorize, files, backup, restore
  utils/                     format, vat, internalNumber, zip, zipReader,
                             backupFormat, colors
  types/index.ts             Typy (Company, Category, Receipt, VatRow, …)
scripts/generate-icons.mjs   Generátor ikony a úvodného obrázka
```

Alias `@/` ukazuje do `src/`.

## 4. Navigácia

| Trasa | Obrazovka | Poznámka |
| --- | --- | --- |
| `/` (tabs) | Doklady, Skenovať, Prehľad, Nastavenia | Bez firmy presmerovanie na `/companies`. |
| `/companies` | Výber firmy | Otvára sa pri prvom spustení aj ťuknutím na názov firmy. |
| `/company/edit?id` | Firma | Bez `id` = nová firma. |
| `/receipt/[id]` | Detail dokladu | |
| `/receipt/edit` | Doklad | Bez `id` = nový doklad; parametre z QR (`ekasaId`, `amountCents`, `vatRows`, `date`, `merchant`, `ico`, `receiptNumber`, `source`, `notice`) ho predvyplnia. |
| `/export` | Export do Pohody | |

Parametre trás sú vždy texty; zložité údaje (rozpis DPH) sa posielajú ako JSON.

## 5. Dátový model

Databáza `invospace.db` (SQLite), cudzie kľúče zapnuté. Verzia schémy je v `PRAGMA user_version` a rovná sa počtu migrácií (aktuálne **8**).

### 5.1 Konvencie
- Sumy sú **celé čísla v centoch** (`*_cents`), nikdy desatinné čísla.
- Dátumy nákupu sú ISO reťazce `RRRR-MM-DD` v lokálnom čase (nie UTC, aby sa deň neposunul).
- Mesačný a ročný filter porovnáva začiatok dátumu (`substr(purchase_date, 1, 7)` alebo `1, 4`).

### 5.2 Tabuľky

**companies** – firmy
| Stĺpec | Typ | Poznámka |
| --- | --- | --- |
| id | INTEGER PK | |
| name | TEXT NOT NULL | |
| ico | TEXT NOT NULL | |
| dic, ic_dph, address | TEXT | nepovinné |
| pohoda_cash_account | TEXT NOT NULL DEFAULT '' | skratka pokladne v Pohode |
| pohoda_accounting | TEXT NOT NULL DEFAULT '' | predvolená predkontácia |
| internal_prefix | TEXT NOT NULL DEFAULT 'PD' | |
| internal_next | INTEGER NOT NULL DEFAULT 1 | počítadlo |
| internal_width | INTEGER NOT NULL DEFAULT 0 | počet číslic (nuly zľava) |

**categories** – kategórie (spoločné pre všetky firmy)
| Stĺpec | Typ | Poznámka |
| --- | --- | --- |
| id | INTEGER PK | |
| name | TEXT NOT NULL UNIQUE | |
| color | TEXT NOT NULL | |
| is_default | INTEGER NOT NULL DEFAULT 0 | predvolené sa nemenia ani nemažú |
| pohoda_accounting | TEXT NOT NULL DEFAULT '' | ide do Textu dokladu |

**receipts** – doklady
| Stĺpec | Typ | Poznámka |
| --- | --- | --- |
| id | INTEGER PK | |
| company_id | INTEGER → companies(id) | doklad patrí vždy jednej firme |
| purchase_date | TEXT NOT NULL | |
| amount_cents | INTEGER NOT NULL | suma s DPH |
| amount_net_cents | INTEGER | suma bez DPH; NULL = neznáma |
| merchant_name, merchant_ico | TEXT | |
| category_id | INTEGER → categories(id) | |
| image_uri | TEXT | trvalá cesta k fotke |
| ekasa_receipt_id | TEXT | dlhý identifikátor z QR (online `O-…`, offline OKP); na odhalenie duplicít |
| receipt_number | TEXT | krátke číslo z bločku |
| internal_number | TEXT | interné číslo, napr. `26/V-001` |
| source | TEXT NOT NULL CHECK ('manual','qr') | |
| note | TEXT | |
| created_at | TEXT NOT NULL | |

Index: `UNIQUE (company_id, internal_number)` – interné číslo je jedinečné v rámci firmy; viac `NULL` je povolených.

**receipt_vat** – rozpis DPH
| Stĺpec | Typ | Poznámka |
| --- | --- | --- |
| receipt_id | INTEGER → receipts(id) ON DELETE CASCADE | |
| vat_rate | INTEGER | sadzba v % (0 = bez DPH) |
| base_cents, vat_cents | INTEGER | základ a DPH |
| | PRIMARY KEY (receipt_id, vat_rate) | |

**merchant_categories** – zapamätanie kategórie obchodu: `merchant_key` (PK), `category_id`.

**settings** – dvojice kľúč/hodnota: `active_company_id`, `last_backup_at`.

### 5.3 Vzťahy

```
companies 1 ─── * receipts * ─── 1 categories 1 ─── * merchant_categories
                    │
                    1
                    │
                    * receipt_vat
```

### 5.4 Migrácie

| Verzia | Zmena |
| --- | --- |
| 1 | Tabuľky categories, receipts, merchant_categories; šesť predvolených kategórií. |
| 2 | `receipts.internal_number`, unikátny index, tabuľka `settings`. |
| 3 | `receipts.receipt_number` (presun ručne zadaných čísel zo `ekasa_receipt_id`). |
| 4 | `receipts.amount_net_cents`. |
| 5 | Tabuľka `receipt_vat`; staršie doklady so sumou bez DPH dostanú sadzbu odhadom z pomeru DPH a základu. |
| 6 | Tabuľka `companies`, `receipts.company_id`; index čísla sa mení na (firma, číslo); doterajšie doklady a nastavenia sa presunú do firmy „Moja firma“. |
| 7 | `companies.internal_width`. |
| 8 | `categories.pohoda_accounting`. |

Migrácia a zápis novej verzie prebehnú v jednej transakcii. Stará migrácia sa nikdy nemení; nová sa pridáva na koniec poľa v `database.ts`.

## 6. Fotky a súbory

- Fotka z kamery alebo galérie je pôvodne v dočasnom priečinku. `files.persistImage` ju skopíruje do `Paths.document/receipts/` pod názvom `receipt_<čas>.<prípona>` a do databázy sa uloží táto cesta.
- Pri zmazaní dokladu sa zmaže aj súbor (`files.deleteImage`); pri úprave s novou fotkou sa starý súbor zmaže až po úspešnom zápise. Pri chybe zápisu sa novo skopírovaná fotka zmaže.
- Export a záloha sa zapisujú do `Paths.cache` a odtiaľ idú na zdieľanie.
- Pri obnove zo zálohy sa fotky zapisujú do nového priečinka `Paths.document/restored_<čas>/`.
- Od SDK 58 sú `File.write()`, `FileHandle.writeBytes()` a `FileHandle.readBytes()` asynchrónne. Tam, kde je dôležité, aby bol zápis hotový alebo aby sa poradie nepomiešalo (zápis exportu pred zdieľaním, postupný zápis ZIP zálohy, čítanie ZIP pri obnove), kód používa synchrónne varianty `writeSync`, `writeBytesSync` a `readBytesSync`.

## 7. Stav a načítanie dát

- **`CompanyContext`** drží zoznam firiem, aktívnu firmu, stav načítania a chybu. Aktívna firma sa ukladá do `settings.active_company_id`. Ak je firma jediná, volí sa sama; ak žiadna nie je, `(tabs)/_layout.tsx` presmeruje na výber firmy.
- **`useLoadOnFocus(loader)`** načíta dáta vždy, keď sa obrazovka zobrazí (aj po návrate späť), a vracia `{ data, loading, error, reload }`. `loader` musí byť stabilný (`useCallback`); zmena jeho závislostí (firma, mesiac, filter) vyvolá nové načítanie.
- Obrazovky nepoužívajú globálny stav okrem firmy. Filtre a režim prehľadu sú lokálny `useState`.

## 8. Rozhrania

### 8.1 eKasa (`src/services/ekasa.ts`)

Celé rozhranie je za jednou funkciou `resolveScan(raw)`. Konštanta `EKASA_LOOKUP_ENABLED` ho dokáže vypnúť.

**Rozpoznanie QR:** `O-` + 32 hexadecimálnych znakov = online doklad (regulárny výraz nájde identifikátor kdekoľvek v texte); päť častí oddelených dvojbodkami s 12-ciferným dátumom = offline doklad (`OKP:kód pokladnice:dátum a čas:poradové číslo:suma`); inak neznámy formát.

**Dopyt:** `POST https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find`, telo `{"receiptId": "<id>"}`, hlavička `Content-Type: application/json`, časový limit 10 s (`AbortController`).

**Použité polia odpovede:** `receipt.receiptId`, `receiptNumber`, `issueDate` (`dd.MM.rrrr HH:mm:ss`, záloha `createDate`), `totalPrice`, `organization.name`, `organization.ico` (záloha `ico`), `vatSummary[].vatBase`, `vatAmount`, `vat.vatRate` (záloha `taxBase*`/`vatAmount*`/`vatRate*`).

**Chybové stavy:** `receipt: null` = doklad sa nenašiel; HTTP 429 = príliš veľa dopytov; iné HTTP = neočakávaná odpoveď; `AbortError` = časový limit; ostatné = sieť. Vo všetkých prípadoch vznikne predvyplnenie s tým, čo sa podarilo získať, a hláška.

**Rozpis DPH z odpovede (`buildVatRows`):** riadok na sadzbu zo `vatSummary`. Rozdiel medzi súčtom riadkov a `totalPrice` do 2 centov sa pripočíta k najväčšiemu základu; väčší kladný rozdiel (položky bez DPH) pridá riadok 0 %; záporný väčší rozdiel rozpis zahodí.

**Offline dátum:** oficiálne zdroje poradie neuvádzajú jednoznačne, preto sa skúša `rrMMdd` a potom `ddMMrr` a berie sa prvý reálny dátum od 2019 po dnes. Rozpoznanie dátumu je overené používateľom na reálnom offline bločku.

**Duplicita:** pred dopytom sa hľadá `ekasa_receipt_id` (OKP pri offline) v tabuľke `receipts` naprieč firmami.

### 8.2 Pohoda XML (`src/services/pohoda.ts`)

Čistá funkcia `buildPohodaXml(mesiac, doklady, rozpisDPH, nastavenia)` vráti XML, názov súboru `InvoSpace_RRRR-MM.xml`, počet dokladov a zoznam upozornení.

**Štruktúra:** `dat:dataPack` verzia 2.0 s menami priestorov `dat`, `vch`, `typ` (schémy Stormware `version_2`). Každý doklad je `dat:dataPackItem` s `vch:voucher`.

| Údaj v XML | Zdroj |
| --- | --- |
| `dataPack@id` | `InvoSpace_<mesiac>` (stále rovnaké pre mesiac) |
| `dataPack@ico` | IČO firmy |
| `dataPackItem@id` | `R<id dokladu>` |
| `voucherType` | `expense` (výdavkový pokladničný doklad) |
| `cashAccount/ids` | skratka pokladne firmy |
| `number/numberRequested` | interné číslo (≤ 32 znakov), ak je |
| `originalDocument` | číslo dokladu z bločku (≤ 32), ak je |
| `date`, `datePayment`, `dateTax` | dátum nákupu |
| `accounting/ids` | predvolená predkontácia firmy, ak je |
| `text` | predkontácia kategórie; ak nie je, „Bloček <dodávateľ> č. <číslo>“ (≤ 240) |
| `partnerIdentity/address` | `company` (dodávateľ, ≤ 255), `ico` (≤ 15) |
| `note`, `intNote` | poznámka; „InvoSpace, eKasa: <id>“ |
| `voucherItem` (jeden na sadzbu) | `text` „<kategória> - <dodávateľ> (sadzba)“ (≤ 90), `quantity` 1, `payVAT` false, `rateVAT`, `unitPrice` = základ, `priceVAT` = DPH |

**Sadzby:** 0 % = `none`; 23 a 20 % = `high`; 19 a 10 % = `low`; 5 % = `third`. Pohoda priradí percentá podľa dátumu dokladu. Doklad bez rozpisu alebo so sadzbou, ktorú nepozná, ide ako `none` a pridá sa upozornenie.

**Kódovanie:** deklarované `Windows-1250`, no súbor je čisté ASCII; všetky znaky mimo ASCII sa zapisujú ako číselné odkazy `&#x…;` (platné pri akomkoľvek kódovaní). Riadiace znaky sa odstránia, texty sa orežú podľa dĺžok v schéme.

**Overenie:** výstup sa validuje voči oficiálnym XSD (`data.xsd` a ďalších 71 závislých schém) cez `XmlSchemaSet`; negatívny test potvrdil, že validátor odhaľuje chyby. Reálny import do Pohody prebehol bez chyby (overil používateľ), takže generované XML je akceptované aj skutočným programom. Pri zmene generátora sa validácia aj import opakujú.

### 8.3 Záloha a obnova

**Formát zálohy:** ZIP bez kompresie, `InvoSpace_zaloha_RRRR-MM-DD.zip`.
- `data.json`: `{ app: "InvoSpace", format: 1, createdAt, schemaVersion, tables: { companies, categories, receipts, receipt_vat, merchant_categories, settings } }`. V `receipts` je namiesto `image_uri` pole `image_file` (relatívna cesta `photos/<názov>` alebo null).
- `photos/<názov>`: fotky bločkov.

**Zápis (`services/backup.ts`, `utils/zip.ts`):** `ZipWriter` zapisuje súbor po súbore cez `FileHandle.writeBytes`, fotky po jednej (pamäť sa nezaplní). Obsahuje CRC-32 a UTF-8 názvy.

**Obnova (`services/restore.ts`, `utils/zipReader.ts`, `utils/backupFormat.ts`):**
1. Výber súboru systémovým výberom; čítanie ZIP po častiach (koniec archívu → centrálny adresár → dáta).
2. `data.json` sa prečíta a overí: aplikácia `InvoSpace`, formát 1, `schemaVersion` nie väčšia než aktuálna verzia schémy, všetky tabuľky prítomné.
3. Každá fotka sa prečíta, overí kontrolným súčtom CRC-32 a zapíše do nového priečinka. Dovtedy sa aktuálne dáta nemenia.
4. V jednej transakcii: zmazanie všetkých tabuliek (deti pred rodičmi), vloženie dát (rodičia pred deťmi; vkladajú sa len stĺpce existujúce v aktuálnej schéme), kontrola `PRAGMA foreign_key_check`. Pri chybe sa transakcia vráti späť.
5. Až po úspešnom zápise sa zmažú pôvodné fotky.
6. Pri akejkoľvek chybe pred potvrdením sa rozpracovaný priečinok s fotkami zmaže a pôvodné dáta ostanú.

Podporuje sa len ZIP vytvorený aplikáciou (metóda „store“); ZIP prebalený iným programom sa odmietne.

### 8.4 Systémové rozhrania

| Funkcia | Rozhranie | Poznámka |
| --- | --- | --- |
| Skenovanie QR | `CameraView` s `barcodeScannerSettings: ['qr']`, `enableTorch` | Povolenie sa vyžiada tlačidlom; kamera beží len na zobrazenom tabe. |
| Fotka z kamery | `ImagePicker.launchCameraAsync` | Povolenie sa pýta až po ťuknutí; kvalita 0,7. |
| Fotka z galérie | `ImagePicker.launchImageLibraryAsync` | Bez samostatného povolenia (systémový výber). |
| Výber súboru zálohy | `File.pickFileAsync` | |
| Zdieľanie | `Sharing.shareAsync` | Export (XML) aj záloha (ZIP). |
| Vibrácie | `Haptics.notificationAsync` | Zlyhanie sa ticho ignoruje. |

## 9. Kľúčové algoritmy

### 9.1 Interné číslovanie (`utils/internalNumber.ts`, `db/numbering.ts`)
- Číslo = `predpona` + `počítadlo` doplnené nulami na `internal_width` číslic. Šírka sa určí z toho, čo používateľ zadá (`001` → 3, `7` → 0).
- Pri otvorení formulára nového dokladu sa navrhne ďalšie číslo firmy.
- Pri uložení (v transakcii s dokladom) sa počítadlo posunie: ak číslo začína predponou a zvyšok sú číslice, `internal_next = max(internal_next, použité + 1)`; iný tvar počítadlo nemení.
- Jedinečnosť zaručuje index (firma, číslo); formulár ju kontroluje vopred a hlási používateľovi.

### 9.2 DPH (`utils/vat.ts`)
- Sadzby ponúkané pri ručnom doklade: od 1. 1. 2025 23 / 19 / 5 / 0 %, predtým 20 / 10 / 0 %.
- Rozdelenie sumy s DPH pre sadzbu `r`: `DPH = round(suma · r / (100 + r))`, `základ = suma − DPH`; ak používateľ zadal sumu bez DPH, základ je ona.
- `computeVatRows` zostaví rozpis, overí, že suma bez DPH nie je väčšia než suma s DPH a že rozpis z eKasa s viacerými sadzbami dáva súčet rovný sume.

### 9.3 Návrh kategórie (`services/categorize.ts`)
- Kľúč obchodu je IČO; ak chýba, názov bez diakritiky (normalizácia NFD), malými písmenami a s jednou medzerou.
- Po uložení sa zapíše (kľúč → kategória). Pri novom doklade sa návrh načíta; kategória zvolená používateľom sa neprepíše.

### 9.4 Prehľady (`db/reports.ts`)
- Súčty počíta databáza: `SUM(amount_cents)` s `GROUP BY category_id`, filter `company_id` a začiatok dátumu (mesiac alebo rok). Rovnaký filter používa zoznam dokladov, preto súčty sedia.
- Graf po mesiacoch dopĺňa mesiace bez dokladov nulou.

## 10. Autentifikácia, súkromie a bezpečnosť

- **Autentifikácia:** žiadna. Aplikácia nemá účty ani prihlasovanie; dáta sú v súkromnom úložisku aplikácie Expo Go v telefóne používateľa.
- **Odchádzajúce dáta:** do siete odchádza len identifikátor dokladu pri dopyte na eKasa. Export a záloha sa odosielajú len na výslovnú akciu používateľa cez systémové zdieľanie.
- **Povolenia:** kamera (až pri použití, s vysvetlením pri odmietnutí). Knižnica fotiek nevyžaduje samostatné povolenie.
- **Záloha** nie je šifrovaná; aplikácia na to upozorňuje.
- **Vstupy zo súboru zálohy:** názvy tabuliek sú pevný zoznam a názvy stĺpcov sa vkladajú do SQL len ak existujú v aktuálnej schéme; hodnoty idú vždy ako parametre; z cesty k fotke sa berie len názov súboru.
- V repozitári nie sú žiadne heslá ani kľúče. `projectId` v `app.json` je identifikátor projektu, nie tajomstvo.

## 11. Spracovanie chýb

- Každá práca so sieťou, súbormi a databázou je v `try/catch` a používateľ dostane slovenskú hlášku.
- Načítanie dát: stav `error` s tlačidlom „Skúsiť znova“ (komponent `ErrorState`); prázdne stavy majú komponent `EmptyState`.
- Chyba otvorenia databázy má vlastnú obrazovku (kontext firiem má stav `error`).
- Neočakávané chyby obrazoviek zachytáva `ErrorBoundary` v koreňovom layoute.
- Pri viackrokových zápisoch (doklad s fotkou, výmena dát pri obnove) sa pri chybe upratuje: zmaže sa nová fotka alebo sa vráti transakcia.

## 12. Overovanie

Automatizované testy v repozitári nie sú. Overovanie prebiehalo takto:
- **Kontrola typov** (`npm run typecheck`, strict) a **zostavenie balíka** pre iOS po každej zmene.
- **Ad hoc skripty mimo repozitára** nad čistými modulmi: parsovanie QR, rozpis DPH z živej odpovede eKasa, formátovanie čísel, ZIP zápis a čítanie (kontrola .NET, poškodená záloha), SQL migrácie a výmena dát na testovacej SQLite databáze.
- **Validácia XML** voči oficiálnym schémam Stormware, vrátane negatívneho testu.
- **Skúška na iPhone** v Expo Go po každej fáze (robí používateľ).
- **Skúška s reálnymi systémami** (robí používateľ): import XML do Pohody prebehol bez chyby a dátum z offline QR kódu sa rozpoznal správne.

## 13. Zostavenie, spustenie a distribúcia

- Vývoj: `npx expo start`, aplikácia sa otvorí v Expo Go naskenovaním QR kódu (pri problémoch so sieťou `--tunnel`).
- Zdieľanie s ďalšími ľuďmi: projekt `@mn1chos-team/invospace` na expo.dev; publikovanie príkazom `eas update --branch main --platform ios --environment preview`. Nahráva sa iba kód. Otvoriť ho môžu len členovia organizácie.
- EAS Build, vlastný build ani natívne priečinky sa nepoužívajú.
- Zdrojový kód je v repozitári na GitHube (`Michal-Mateasik/InvoSpace`).

## 14. Dôležité rozhodnutia a alternatívy

| Rozhodnutie | Dôvod | Zamietnutá alternatíva |
| --- | --- | --- |
| Sumy v centoch ako celé čísla | Bez chýb desatinných čísel. | Desatinné čísla. |
| Dátum ako `RRRR-MM-DD` v lokálnom čase | Deň sa neposunie v UTC; jednoduchý filter mesiaca. | Plný časový údaj v UTC. |
| SQLite s verzovanými migráciami | Bezpečná zmena schémy v telefóne. | Ukladanie JSON súborov. |
| Rozpis DPH v samostatnej tabuľke | Doklad môže mať viac sadzieb; Pohoda ich potrebuje zvlášť. | Jedno pole „DPH“ na doklade. |
| Interné číslo s predponou, počítadlom a nulami pri firme | Každá firma má vlastný rad. | Globálne číslovanie. |
| Vlastný generátor XML + validácia voči XSD | Pohoda odmietne chybný formát; formát je pevný. | Hotová knižnica (v Expo Go nie je vhodná). |
| ASCII s číselnými odkazmi namiesto kódovania Windows-1250 | Bez konverznej tabuľky a bez rizika zlej diakritiky. | Zápis bytov vo Windows-1250. |
| Vlastný ZIP zapisovač a čítač (bez kompresie) | Bez natívneho modulu; fotky sú už skomprimované. | Knižnica na ZIP (natívny kód). |
| Obnova v dvoch fázach (overenie, potom transakcia) | Chybná záloha nesmie zničiť existujúce dáta. | Priamy zápis do databázy. |
| Zdieľanie cez EAS Update | Zachováva pravidlo „všetko v Expo Go“. | EAS Build + TestFlight (vyžaduje Apple účet a zmenu pravidla). |
| Kategórie spoločné pre všetky firmy | Jednoduchosť; rovnaké kategórie a predkontácie. | Kategórie pri každej firme. |

## 15. Známe obmedzenia a technický dlh

- Aplikácia závisí od neoficiálneho vyhľadávania eKasa.
- Dáta sú len v Expo Go v telefóne; pri odinštalovaní sa stratia, ak chýba záloha.
- Po vydaní nového SDK treba projekt presunúť, inak sa v aktualizovanom Expo Go neotvorí.
- `Alert.prompt` (premenovanie kategórie, zadanie predkontácie) funguje len na iOS.
- Nie sú automatizované testy v repozitári.
- Súbor `.npmrc` s `legacy-peer-deps=true` je potrebný, lebo balík `@react-native-community/datetimepicker` 9.2 uvádza ako voliteľnú závislosť `react-native-windows`, ktorá vyžaduje staršiu verziu React Native. Appka beží len na iPhone, ale bez tohto nastavenia `npm install` zlyhá. Nastavenie skrýva aj iné konflikty peer závislostí, preto sa po každej zmene balíkov spúšťa `npx expo-doctor`.

## 16. Poradie implementácie

Poradie zodpovedá fázam z [CLAUDE.md](CLAUDE.md) (sekcia 9). Každý krok je jeden beh pipeline `/implement DESIGN.md <číslo>`. Beh implementuje iba svoj krok, predchádzajúce kroky považuje za hotové a na konci musí prejsť `npm run typecheck`.

**Cieľ a rozsah:** lokálna iPhone aplikácia v Expo Go na evidenciu dokladov, bez servera (sekcia 1 a [SPEC.md](SPEC.md)).

| Krok | Obsah | Hlavné súbory | Hotovo, keď |
| --- | --- | --- | --- |
| 0 | Projekt, Expo Router, taby s prázdnymi obrazovkami | `app/(tabs)/*`, `app.json` | Taby sa dajú prepínať v Expo Go. |
| 1 | Databáza a migrácie, ručné pridanie dokladu s fotkou, zoznam, detail, úprava, zmazanie | `src/db/`, `src/services/files.ts`, `app/receipt/*` | Doklad aj s fotkou prežije reštart aplikácie; pri zmazaní sa zmaže aj súbor. |
| 2 | Kategórie, ich správa, zapamätanie kategórie pre obchod, filtre | `src/db/`, `src/services/categorize.ts`, `app/(tabs)/settings.tsx` | Druhý doklad z rovnakého obchodu má kategóriu predvyplnenú. |
| 3 | Skenovanie QR eKasa, dopyt na API, záložný postup | `src/services/ekasa.ts`, `app/(tabs)/scan.tsx` | Reálny bloček predvyplní údaje; bez siete sa otvorí ručný formulár. |
| 4 | Mesačný prehľad s grafom | `src/db/reports.ts`, `app/(tabs)/report.tsx` | Súčty sedia s dokladmi v zozname za ten istý mesiac. |
| 5 | Export mesačného XML pre Pohodu a zdieľanie | `src/services/pohoda.ts`, `src/utils/vat.ts` | XML prejde validáciou voči XSD a importom do Pohody. |
| 6 | Doladenie: blesk, haptika, prázdne stavy, chybové hlášky | `app/*`, `src/components/` | Aplikácia pôsobí dokončene. |
| 7 | Doplnky: firmy, interné číslovanie, rozpis DPH, záloha a obnova | `src/db/`, `src/services/backup.ts`, `src/utils/internalNumber.ts` | Záloha sa dá obnoviť; poškodená záloha dáta nezničí. |

Pravidlá pre každý krok: schéma sa mení len novou migráciou (sekcia 5.4), SQL ostáva v `src/db/`, nové balíky sa inštalujú cez `npx expo install` a nič nevyžaduje natívny kód.

## 17. Testovacia stratégia

Aplikácia zatiaľ nemá automatizované testy v repozitári (sekcia 15). Implementer a verifier preto používajú tieto kontroly:

| Kontrola | Príkaz / postup | Kedy |
| --- | --- | --- |
| Kontrola typov (strict) | `npm run typecheck` | Po každom kroku, povinne. |
| Zdravie závislostí | `npx expo-doctor` | Po každej zmene balíkov. |
| Čisté moduly (`src/utils`, parsovanie QR, DPH, ZIP) | Ad hoc skript mimo repozitára alebo nový test, ak ho krok výslovne vyžaduje | Pri zmene týchto modulov. |
| Migrácie a výmena dát | Skúška na testovacej SQLite databáze: migrácia z predchádzajúcej verzie, obnova zo zálohy | Pri zmene schémy alebo zálohy. |
| Pohoda XML | Validácia voči XSD Stormware vrátane negatívneho testu | Pri každej zmene `pohoda.ts`. |
| Čítanie kódu podľa CLAUDE.md | Verifier skontroluje sumy v centoch, SQL len v `src/db/`, timeout eKasa, ošetrenie chýb | Pri každom behu. |
| Skúška na iPhone v Expo Go | Zoznam krokov v popise PR; robí Michal | Po každom kroku. |

Agenti nevedia spustiť aplikáciu na telefóne. Čo sa bez nej nedá overiť, uvedú v reporte výslovne.

## 18. Riziká

| Riziko | Dôsledok | Ošetrenie |
| --- | --- | --- |
| Neoficiálne API eKasa sa zmení alebo vypadne | Skenovanie QR nepredvyplní údaje | Rozhranie v `ekasa.ts`, timeout 10 s, vždy funkčný ručný formulár a offline QR. |
| Nový SDK vydaný skôr, než sa projekt presunie | Aplikácia sa v aktualizovanom Expo Go neotvorí | Po vydaní nového SDK presunúť projekt (sekcia 15). |
| Nový balík s natívnym kódom mimo Expo Go | Aplikácia v Expo Go nebeží | Verifier kontroluje zmeny v `package.json`; inštalácia len cez `npx expo install`. |
| Chybná migrácia alebo obnova zo zálohy | Strata dokladov | Migrácie verzované, obnova v dvoch fázach a v jednej transakcii. |
| Zmena XML generátora | Pohoda import odmietne súbor | Povinná validácia voči XSD pri každej zmene. |
| Chýbajúce automatizované testy | Regresie sa zachytia až pri skúške na telefóne | Typecheck, kontrola verifierom a skúška na iPhone po každom kroku. |
