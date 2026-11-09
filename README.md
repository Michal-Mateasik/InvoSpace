# InvoSpace

Mobilná aplikácia na evidenciu dokladov (najmä blokov z pokladní) pre iPhone. Školský projekt.
Všetky dáta sú uložené lokálne v telefóne, bez servera a bez prihlasovania.

## Dokumentácia projektu

| Dokument | Obsah |
| --- | --- |
| [SPEC.md](SPEC.md) | Špecifikácia: ČO aplikácia robí (problém, roly, funkcie, obmedzenia, mimo rozsahu, otvorené otázky) |
| [docs/USER_STORIES.md](docs/USER_STORIES.md) | Používateľské príbehy s akceptačnými kritériami (KEDY JE HOTOVO) |
| [DESIGN.md](DESIGN.md) | Design dokument: AKO je aplikácia postavená (architektúra, dátový model, rozhrania, štruktúra kódu) |
| [docs/INITIATIVE.md](docs/INITIATIVE.md), [docs/EPICS.md](docs/EPICS.md) | Iniciatíva a epicy |
| [CLAUDE.md](CLAUDE.md) | Pokyny a pravidlá pre vývoj s AI |

## Použité technológie

- **TypeScript** (strict mode)
- **React Native + Expo SDK 58** (managed workflow, beží v aplikácii Expo Go)
- **Expo Router** – navigácia (taby + stack)
- `expo-sqlite` (databáza), `expo-file-system` (fotky a súbory), `expo-camera` (QR kódy, blesk), `expo-image-picker` (fotka z kamery/galérie), `expo-sharing` (zdieľanie exportu a zálohy), `expo-haptics` (vibrácia), `react-native-svg` (grafy)
- Žiadny backend ani state-management knižnica; stav drží React (state, kontext `CompanyContext` a vlastné hooky).

## Štruktúra projektu

```
app/                      # obrazovky (Expo Router – súbor = adresa obrazovky)
  _layout.tsx             # koreňový stack, poskytovateľ firiem, poistka proti pádu
  (tabs)/                 # spodná lišta: index (Doklady), scan, report (Prehľad), settings
  receipt/[id].tsx        # detail dokladu
  receipt/edit.tsx        # pridanie / úprava dokladu
  companies.tsx           # výber firmy
  company/edit.tsx        # pridanie / úprava firmy
  export.tsx              # export do Pohody
src/
  context/                # aktívna firma (CompanyContext)
  db/                     # pripojenie a migrácie (database.ts) a všetky SQL dotazy
  services/               # ekasa.ts (QR + API), pohoda.ts (XML), backup.ts, categorize.ts, files.ts
  components/             # znovupoužiteľné UI komponenty
  hooks/                  # useLoadOnFocus
  utils/                  # formátovanie, DPH, číslovanie, zip, farby
  types/                  # typy
scripts/generate-icons.mjs  # generátor ikony a splash obrázka
assets/images/            # ikona aplikácie a splash obrázok
```

Alias `@/` v importoch ukazuje do priečinka `src/` (napr. `@/utils/colors`).

## Spustenie

Vyžaduje Node.js 22.13+ a aplikáciu **Expo Go** v iPhone.

```powershell
npm install
npx expo start
```

Naskenuj QR kód z terminálu kamerou iPhonu, aplikácia sa otvorí v Expo Go.
Telefón a notebook musia byť v rovnakej Wi-Fi. Ak sa nespoja, použi `npx expo start --tunnel`.

Kontrola typov: `npm run typecheck`.

## Postup vývoja

- **Fáza 0** – založený projekt (TypeScript, Expo Router), 4 taby (Doklady, Skenovať, Prehľad, Nastavenia) s prázdnymi obrazovkami.
- **Fáza 1** – lokálna databáza SQLite, ručné pridanie dokladu s fotkou, zoznam, detail, úprava a zmazanie.
  - `src/db/database.ts` otvorí databázu a spustí migrácie (verzia schémy je v `PRAGMA user_version`); pri prvom spustení vytvorí tabuľky a predvolené kategórie.
  - `src/db/receipts.ts`, `src/db/categories.ts` – všetky SQL dotazy (obrazovky SQL nepíšu).
  - `src/services/files.ts` – fotku z kamery/galérie skopíruje do trvalého priečinka `receipts/` v dokumentoch aplikácie; pri zmazaní dokladu zmaže aj súbor.
  - `app/(tabs)/index.tsx` – zoznam, `app/receipt/[id].tsx` – detail, `app/receipt/edit.tsx` – pridanie aj úprava.
  - Sumy sa ukladajú v centoch (celé čísla), dátum ako ISO reťazec `RRRR-MM-DD`.

- **Fáza 2** – kategórie, zapamätanie kategórie pre obchod, filtre v zozname.
  - Tab Nastavenia: pridanie, premenovanie a mazanie vlastných kategórií (predvolené sa nemenia). Pri zmazaní sa doklady presunú do „Ostatné“.
  - `src/services/categorize.ts` – kľúč obchodu je IČO, inak normalizovaný názov (bez diakritiky, malé písmená). Po uložení dokladu sa dvojica obchod → kategória zapíše do `merchant_categories`; pri ďalšom doklade z rovnakého obchodu sa kategória predvyplní.
  - Zoznam dokladov: filter podľa mesiaca a kategórie a súčet za zobrazený výber.

- **Doplnenie po fáze 2 (na žiadosť)** – evidencia dodávateľa, čísla dokladu a interného čísla.
  - Doklad nesie: dátum, dodávateľa, sumu, **číslo dokladu** (`ekasa_receipt_id`; vo fáze 3 ho vyplní QR kód, dá sa aj zadať ručne) a **interné číslo** (`internal_number`, napr. PD1).
  - Interné číslo sa pri novom doklade navrhne automaticky (predpona + počítadlo) a po uložení sa počítadlo zvýši. Používateľ ho môže prepísať; ak zadá vlastné číslo v tvare predpona + číslo (napr. PD20), počítadlo preskočí za neho. Čísla sú jedinečné (UNIQUE index), duplicitu aplikácia odmietne.
  - Predponu a ďalšie číslo nastavuje používateľ v Nastaveniach. Migrácia č. 2 doplnila čísla PD1, PD2, … aj k už uloženým dokladom.
  - Kód: `src/db/numbering.ts`, tabuľka `settings`.

- **Fáza 3** – skenovanie QR kódu eKasa (`expo-camera`) a predvyplnenie dokladu.
  - `src/services/ekasa.ts` (jediné miesto, kde sa rieši eKasa): rozpozná **online** doklad (identifikátor `O-` + 32 hex znakov) a **offline** doklad (`OKP:kód pokladnice:dátum a čas:poradové číslo:suma`).
  - Online doklad: `POST https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find` s telom `{"receiptId": "..."}`. Z odpovede berieme sumu (`totalPrice`), dátum (`issueDate`), dodávateľa a IČO (`organization`) a číslo dokladu (`receiptNumber`). Neexistujúci doklad vracia `receipt: null`. Timeout je 10 s.
  - Offline doklad: suma, dátum a číslo dokladu sa vyčítajú priamo z kódu (bez internetu).
  - Záložný postup: pri chybe siete, timeoute, nenájdenom doklade alebo vypnutom API sa otvorí formulár s tým, čo sa podarilo získať, a žltým upozornením. Neznámy QR kód ponúkne „Skenovať znova“ alebo „Vyplniť ručne“.
  - Duplicitný sken toho istého bločku aplikácia rozpozná (podľa `ekasa_receipt_id`) a ponúkne otvorenie existujúceho dokladu.
  - Pri doklade z QR sa kategória pamätá podľa IČO (nie podľa názvu).
  - „Číslo dokladu“ (`receipt_number`, krátke číslo z bločku) je oddelené od `ekasa_receipt_id` (dlhý identifikátor z QR, slúži na odhalenie duplicít). Migrácia č. 3 presunula ručne zadané čísla.

- **Doplnenie po fáze 3** – suma bez DPH (`amount_net_cents`, migrácia č. 4). Z eKasa sa počíta ako `totalPrice − vatAmountBasic − vatAmountReduced`. Offline QR DPH neobsahuje, tam sa zadáva ručne (pole je nepovinné). V detaile sa zobrazí aj výška DPH.

- **Fáza 4** – mesačný prehľad (tab Prehľad).
  - Prepínanie mesiacov šípkami (do budúcnosti sa nedá), celková suma za mesiac, počet dokladov, súčty podľa kategórií s podielom v % a stĺpcový graf.
  - `src/db/reports.ts` – súčty počíta databáza (`SUM … GROUP BY`) so rovnakým filtrom mesiaca ako zoznam dokladov, preto súčty sedia so zoznamom.
  - `src/components/BarChart.tsx` – vlastný stĺpcový graf cez `react-native-svg` (bez ďalšej knižnice na grafy).
  - Suma bez DPH sa v prehľade ukazuje len z dokladov, kde je uvedená, s poznámkou, ak nie je pri všetkých.

- **Doplnenie po fáze 4** – ročný prehľad a oprava filtra.
  - Prehľad má prepínač Mesiac / Rok. V ročnom pohľade pribudol graf a zoznam po mesiacoch (`getMonthlyTotals`); súčty (`getPeriodSummary`) fungujú pre mesiac aj rok rovnakým dotazom.
  - Chyba filtra v zozname: vodorovný `ScrollView` má predvolene `flexGrow: 1`, takže sa pri krátkom zozname natiahol. V `FilterChips` je rast vypnutý (`flexGrow: 0`).

- **Fáza 5 (zmenená)** – export do Pohody namiesto PDF. Finálny export je jeden XML súbor za mesiac, len s údajmi dokladov (bez fotiek), určený na import do účtovného programu Pohoda (STORMWARE).
  - Tlačidlo je v Nastaveniach (obrazovka `app/export.tsx`). Používateľ zadá IČO firmy, skratku pokladne a nepovinne predkontáciu; tie sa uložia.
  - `src/services/pohoda.ts` – generátor XML (dataPack 2.0, výdavkový pokladničný doklad `voucher`). Interné číslo → číslo dokladu, číslo z bločku → `originalDocument`, dodávateľ a IČO → `partnerIdentity`, DPH → jedna položka na sadzbu (základ + DPH).
  - Rozpis DPH po sadzbách (`receipt_vat`, migrácia č. 5): z eKasa sa načíta celý (`vatSummary`), pri ručnom doklade sa zvolí sadzba (23/19/5 %, do 2024 20/10 %) a základ aj DPH sa dopočítajú. Staršie doklady so známou sumou bez DPH dostali sadzbu odhadom pri migrácii.
  - Doklad bez rozpisu DPH sa exportuje ako bez DPH a aplikácia na to pred exportom upozorní.
  - XML je čisté ASCII (diakritika ako `&#x…;`), preto je platné pri akomkoľvek kódovaní. Výstup bol overený validáciou voči oficiálnym XSD schémam Stormware a reálnym importom do Pohody (prebehol bez chyby).
  - `id` balíka je pre mesiac stále rovnaké (`InvoSpace_2026-10`), takže Pohoda pri opakovanom importe doklady nezdvojí.

- **Firmy (po fáze 5)** – bločky sa evidujú pod firmou.
  - Pri prvom spustení appka ponúkne vytvoriť firmu (názov, IČO, DIČ, IČ DPH, adresa). Firma nesie aj údaje na export do Pohody (skratka pokladne, predkontácia) a vlastné číslovanie dokladov (predpona a ďalšie číslo), takže sa nič nepýta pri každom exporte.
  - Zvolená firma sa pamätá. Meniť sa dá ťuknutím na názov firmy nad zoznamom dokladov a prehľadom alebo v Nastaveniach. Ak je firma jediná, volí sa sama.
  - Zoznam, prehľad aj export zobrazujú vždy len doklady aktívnej firmy. Interné číslo je jedinečné v rámci firmy (každá firma má vlastný rad PD1, PD2, …). Kategórie sú spoločné pre všetky firmy.
  - Číslovanie zachováva nuly na začiatku: predpona `26/V-` a ďalšie číslo `001` dá 26/V-001, 26/V-002, … (počet číslic sa berie z toho, čo je zadané; stĺpec `internal_width`, migrácia č. 7). Logika je v `src/utils/internalNumber.ts`.
  - Firma s dokladmi sa nedá zmazať (najprv treba zmazať jej doklady).
  - Migrácia č. 6: doterajšie doklady a nastavenia sa presunuli do firmy „Moja firma“ (doplň jej názov a IČO).
  - Kód: `src/context/CompanyContext.tsx` (aktívna firma), `src/db/companies.ts`, `app/companies.tsx`, `app/company/edit.tsx`.

- **Predkontácia podľa kategórie (po fáze 5)** – každá kategória (aj predvolená) môže mať predkontáciu z Pohody (`categories.pohoda_accounting`, migrácia č. 8; nastavuje sa v Nastaveniach ikonou kalkulačky pri kategórii). Export ju pošle do poľa **Text dokladu** (`voucherHeader/text`), určeného na filtrovanie v Pohode. Ak kategória predkontáciu nemá, Text je popis dokladu („Bloček …“), lebo Pohoda Text vyžaduje. Predkontácia firmy ostáva v hlavičke dokladu ako skutočná predkontácia (`voucherHeader/accounting`).

- **Fáza 6 – doladenie.**
  - **Blesk** pri skenovaní (tlačidlo v tabe Skenovať, `enableTorch`) a **haptická odozva** (`expo-haptics`): úspešný sken zavibruje potvrdzovacím vzorom, neznámy QR a duplicita varovným.
  - **Prázdne a chybové stavy** sú spoločné komponenty `src/components/StateViews.tsx` (ikona, text, rada čo robiť; chyba s tlačidlom „Skúsiť znova“). Chyba otvorenia databázy má vlastnú obrazovku a globálna poistka (`ErrorBoundary` v `app/_layout.tsx`) namiesto zrútenia ukáže zrozumiteľnú hlášku.
  - **Ikona a úvodná obrazovka** sú vlastné (bloček na modrom). Vygenerované skriptom `scripts/generate-icons.mjs` bez externých knižníc.
- **Záloha dát (na žiadosť).** Nastavenia → Zálohovať dáta vytvorí jeden ZIP `InvoSpace_zaloha_RRRR-MM-DD.zip` a otvorí systémové zdieľanie.
  - Obsah: `data.json` (všetky tabuľky: firmy, kategórie, doklady, rozpis DPH, zapamätané obchody, nastavenia; doklad má namiesto cesty v telefóne `image_file` s relatívnou cestou) a priečinok `photos/` s fotkami. ZIP sa dá otvoriť na počítači.
  - `src/utils/zip.ts` – vlastný zapisovač ZIP bez kompresie (fotky sú už JPEG). Zapisuje po jednej fotke, takže pamäť sa pri veľa fotkách nezaplní. `src/services/backup.ts`, `src/db/backup.ts`.
  - Záloha nie je šifrovaná.
  - **Obnovenie zo zálohy** (Nastavenia → Obnoviť zo zálohy): nahradí všetky dáta v telefóne dátami zo ZIP. Je poistené: najprv sa záloha celá prečíta a overí (štruktúra, verzia, kontrolné súčty CRC fotiek) a fotky sa uložia do nového priečinka bez zásahu do aktuálnych dát; až potom sa obsah databázy vymení v jednej transakcii (pri chybe, aj pri porušení cudzích kľúčov, sa vráti späť) a pôvodné fotky sa zmažú nakoniec. Záloha z novšej verzie aplikácie sa odmietne. Kód: `src/services/restore.ts`, `src/utils/zipReader.ts`, `src/utils/backupFormat.ts`. Podporuje len ZIP vytvorený samotnou aplikáciou (bez kompresie), nie ZIP prebalený iným programom.

- **Zdieľanie s ďalšími ľuďmi (EAS Update v Expo Go).** Projekt je na expo.dev pod organizáciou `mn1chos-team` (`@mn1chos-team/invospace`), `app.json` obsahuje `owner`, `extra.eas.projectId`, `updates.url` a `runtimeVersion`. Ide o EAS Update (nie EAS Build); appka sa naďalej otvára cez Expo Go a každý má dáta len vo svojom telefóne (nahráva sa len kód).
  - Nová verzia sa publikuje: `npx eas-cli update --branch main --message "popis" --platform ios --environment preview` (pri práci bez git repozitára s premennou `EAS_NO_VCS=1`).
  - Otvorenie: odkaz „EAS Dashboard“ z výstupu príkazu → tlačidlo Preview → QR kód naskenovať v Expo Go. V Expo Go sa dajú načítať len projekty, ktoré vlastní používateľ alebo jeho organizácia, preto musia byť ľudia členmi organizácie `mn1chos-team` na expo.dev.
- **Upgrade na Expo SDK 58** (z SDK 57; React Native 0.88, React 19.3). Postup: `npm install expo@^58.0.0`, `npx expo install --fix`, `npx expo-doctor` (20/20 v poriadku). Zmeny v kóde: zápis a čítanie súborov je v SDK 58 asynchrónne, preto sa tam, kde je dôležité poradie (zápis exportu, ZIP zálohy, obnova), používajú synchrónne varianty (`writeSync`, `writeBytesSync`, `readBytesSync`); drobná úprava typu farby ikony v `app/(tabs)/_layout.tsx`; pribudol `expo-font` (vyžaduje ho balík ikon). Súbor `.npmrc` s `legacy-peer-deps=true` obchádza konflikt voliteľnej závislosti `react-native-windows` v balíku `datetimepicker`; bez neho `npm install` zlyhá. Appka vyžaduje Expo Go s podporou SDK 58.

## Dátový model

Tabuľky `categories`, `receipts`, `merchant_categories` a `settings` (predpona a počítadlo interného čísla).
Stĺpce sú popísané v `src/db/database.ts`.
