# USER STORIES – InvoSpace

Používateľské príbehy epicov z [EPICS.md](EPICS.md) (iniciatíva [INIT-1](INITIATIVE.md)).

**Formát príbehu:** Ako *rola* chcem *čo*, aby *prečo*. Každý príbeh má akceptačné kritériá, ktoré popisujú správanie hotovej aplikácie.

**Role:**
- **Používateľ** – majiteľ firmy alebo zamestnanec, ktorý eviduje bločky na iPhone.
- **Účtovník** – spracúva doklady v programe Pohoda.
- **Autor** – Michal Mateasik, ktorý projekt vyvíja a obhajuje.

**Priorita (MoSCoW):** Must / Should / Could. **Stav:** Hotové = implementované a odskúšané používateľom na iPhone.

## Prehľad príbehov

| ID | Príbeh | Epic | Priorita | Stav |
| --- | --- | --- | --- | --- |
| US-01 | Ručné pridanie dokladu | EP-1 | Must | Hotové |
| US-02 | Odfotenie bločku kamerou | EP-1 | Must | Hotové |
| US-03 | Výber fotky z galérie | EP-1 | Should | Hotové |
| US-04 | Zoznam dokladov | EP-1 | Must | Hotové |
| US-05 | Filter zoznamu a súčet výberu | EP-1 | Must | Hotové |
| US-06 | Detail dokladu so zväčšením fotky | EP-1 | Must | Hotové |
| US-07 | Úprava a zmazanie dokladu | EP-1 | Must | Hotové |
| US-08 | Sken online QR kódu eKasa | EP-2 | Must | Hotové |
| US-09 | Sken offline QR kódu | EP-2 | Should | Hotové |
| US-10 | Záložný postup pri chybe skenovania | EP-2 | Must | Hotové |
| US-11 | Odhalenie duplicitného skenu | EP-2 | Should | Hotové |
| US-12 | Povolenie kamery až pri použití | EP-2 | Must | Hotové |
| US-13 | Blesk pri skenovaní | EP-2 | Could | Hotové |
| US-14 | Haptická odozva po skenovaní | EP-2 | Could | Hotové |
| US-15 | Výber kategórie pri doklade | EP-3 | Must | Hotové |
| US-16 | Správa vlastných kategórií | EP-3 | Must | Hotové |
| US-17 | Zapamätanie kategórie pre obchod | EP-3 | Should | Hotové |
| US-18 | Vytvorenie firmy | EP-4 | Must | Hotové |
| US-19 | Prepínanie firiem | EP-4 | Must | Hotové |
| US-20 | Úprava a zmazanie firmy | EP-4 | Should | Hotové |
| US-21 | Automatické interné číslo dokladu | EP-4 | Must | Hotové |
| US-22 | Nastavenie číslovania s nulami | EP-4 | Must | Hotové |
| US-23 | Číslo dokladu z bločku | EP-4 | Must | Hotové |
| US-24 | Suma s DPH a bez DPH | EP-5 | Must | Hotové |
| US-25 | Rozpis DPH po sadzbách | EP-5 | Must | Hotové |
| US-26 | Upozornenie na doklady bez rozpisu DPH | EP-5 | Should | Hotové |
| US-27 | Mesačný prehľad | EP-6 | Should | Hotové |
| US-28 | Ročný prehľad | EP-6 | Could | Hotové |
| US-29 | Export mesačného XML pre Pohodu | EP-7 | Must | Hotové |
| US-30 | Nastavenia exportu pri firme | EP-7 | Must | Hotové |
| US-31 | Predkontácia kategórie v texte dokladu | EP-7 | Should | Hotové |
| US-32 | Bez duplicít pri opakovanom importe | EP-7 | Should | Hotové |
| US-33 | Zdieľanie exportu | EP-7 | Must | Hotové |
| US-34 | Platnosť XML voči schémam Stormware | EP-7 | Must | Hotové |
| US-35 | Záloha dát | EP-8 | Should | Hotové |
| US-36 | Obnova zo zálohy | EP-8 | Should | Hotové |
| US-37 | Prázdne stavy | EP-9 | Should | Hotové |
| US-38 | Zrozumiteľné chyby a ochrana pred pádom | EP-9 | Must | Hotové |
| US-39 | Slovenské rozhranie a formáty | EP-9 | Must | Hotové |
| US-40 | Ikona a úvodná obrazovka | EP-9 | Could | Hotové |
| US-41 | Zdieľanie aplikácie s vybranými ľuďmi | EP-10 | Could | Hotové |
| US-42 | Dokumentácia na obhajobu | EP-10 | Must | Hotové |

Import XML do reálnej Pohody a rozpoznanie dátumu v offline QR kóde overil používateľ.

---

# EP-1 – Evidencia dokladov

### US-01 – Ručné pridanie dokladu
**Ako** používateľ **chcem** zaevidovať doklad zadaním sumy, dátumu, dodávateľa, kategórie a poznámky, **aby** som mal doklad v aplikácii aj bez QR kódu.

**Akceptačné kritériá:**
- Formulár má polia suma, dátum nákupu, dodávateľ, kategória a nepovinnú poznámku.
- Sumu možno zadať s čiarkou aj bodkou (`12,50`, `12.5`); suma 0 alebo neplatný text zobrazí hlášku a doklad sa neuloží.
- Dátum sa vyberá výberom dátumu; predvolený je dnešný.
- Po uložení sa doklad objaví v zozname a ostane tam aj po reštarte aplikácie.
- Suma sa ukladá v centoch.

### US-02 – Odfotenie bločku kamerou
**Ako** používateľ **chcem** odfotiť bloček kamerou priamo vo formulári, **aby** sa fotka uložila k dokladu.

**Akceptačné kritériá:**
- Povolenie ku kamere sa pýta až po ťuknutí na „Odfotiť“.
- Pri odmietnutí sa zobrazí vysvetlenie a možnosť otvoriť nastavenia telefónu.
- Fotka sa pred uložením skopíruje z dočasného do trvalého priečinka aplikácie a v databáze je jej trvalá cesta.
- Fotku možno pred uložením odstrániť alebo nahradiť.

### US-03 – Výber fotky z galérie
**Ako** používateľ **chcem** vybrať fotku bločku z galérie, **aby** som mohol doklad zaevidovať aj z už urobenej fotky.

**Akceptačné kritériá:**
- Výber používa systémový výber fotiek (nevyžaduje samostatné povolenie ku galérii).
- Vybraná fotka sa kopíruje do trvalého priečinka rovnako ako pri fotení.

### US-04 – Zoznam dokladov
**Ako** používateľ **chcem** vidieť zoznam svojich dokladov od najnovších, **aby** som sa v nich rýchlo zorientoval.

**Akceptačné kritériá:**
- Riadok obsahuje miniatúru fotky, interné číslo, dodávateľa, dátum, kategóriu a sumu v tvare `12,50 €`.
- Zoradenie je podľa dátumu nákupu zostupne; pri rovnakom dátume rozhoduje poradie pridania.
- Ak firma nemá žiadny doklad, zobrazí sa prázdny stav s radou, čo robiť.
- Zoznam obsahuje len doklady aktívnej firmy.

### US-05 – Filter zoznamu a súčet výberu
**Ako** používateľ **chcem** filtrovať doklady podľa mesiaca a kategórie a vidieť súčet výberu, **aby** som vedel, koľko som minul v danom období.

**Akceptačné kritériá:**
- Ponúkajú sa len mesiace, v ktorých firma má doklady, a všetky kategórie; možnosť „Všetky“ filter zruší.
- Pod filtrami je súčet a počet zobrazených dokladov.
- Ak po zmazaní dokladu alebo kategórie zvolený filter už neexistuje, vráti sa na „Všetky“.
- Ak filter nevyhovuje žiadny doklad, zobrazí sa prázdny stav pre filter.

### US-06 – Detail dokladu so zväčšením fotky
**Ako** používateľ **chcem** otvoriť detail dokladu a zväčšiť fotku, **aby** som si prečítal drobný text na bločku.

**Akceptačné kritériá:**
- Detail zobrazuje fotku, sumu, interné číslo, dodávateľa, číslo dokladu, dátum, kategóriu, poznámku a rozpis DPH.
- Ťuknutím na fotku sa zobrazí na celú obrazovku; ďalším ťuknutím sa zatvorí.

### US-07 – Úprava a zmazanie dokladu
**Ako** používateľ **chcem** doklad upraviť alebo zmazať, **aby** som mohol opraviť chybu alebo odstrániť nechcený doklad.

**Akceptačné kritériá:**
- Úprava otvorí ten istý formulár s vyplnenými údajmi; po uložení sa zmeny prejavia v detaile aj v zozname.
- Pri výmene fotky sa pôvodný súbor zmaže až po úspešnom uložení.
- Zmazanie vyžaduje potvrdenie a zmaže aj súbor s fotkou.
- Pri chybe ukladania sa nevytvorí osirelý súbor a používateľ dostane hlášku.

---

# EP-2 – Skenovanie QR kódu eKasa

### US-08 – Sken online QR kódu eKasa
**Ako** používateľ **chcem** naskenovať QR kód z bločku, **aby** sa údaje predvyplnili a nemusel som ich prepisovať.

**Akceptačné kritériá:**
- Rozpozná sa identifikátor online dokladu (`O-` a 32 hexadecimálnych znakov).
- Aplikácia vyhľadá doklad vo verejnom vyhľadávaní eKasa a predvyplní dodávateľa, IČO, dátum, sumu, číslo dokladu a rozpis DPH.
- Formulár ukáže upozornenie „Údaje sa načítali z eKasa. Skontroluj ich pred uložením.“
- Dopyt má timeout približne 10 sekúnd.
- Ak je obchod známy (podľa IČO), predvyplní sa jeho kategória.
- Doklad sa uloží ako zdroj „qr“ s identifikátorom eKasa.

### US-09 – Sken offline QR kódu
**Ako** používateľ **chcem** naskenovať aj offline bloček, **aby** som aspoň sumu a dátum nemusel prepisovať.

**Akceptačné kritériá:**
- Offline kód (údaje oddelené dvojbodkami) sa rozpozná bez dopytu do siete.
- Z kódu sa vyčíta suma, dátum a číslo dokladu; formulár upozorní, že treba doplniť dodávateľa.
- Poradie dátumu v kóde aplikácia rozpozná sama (skúša oba tvary a berie reálny dátum od roku 2019 po dnes); rozpoznanie je overené na reálnom offline bločku. Dátum sa dá vo formulári aj opraviť.

### US-10 – Záložný postup pri chybe skenovania
**Ako** používateľ **chcem**, aby sa pri chybe skenovania nič nezasekne a mohol som doklad doplniť ručne, **aby** som o doklad neprišiel.

**Akceptačné kritériá:**
- Pri chybe siete, timeoute, nenájdenom doklade alebo vypnutom vyhľadávaní sa otvorí formulár so zrozumiteľnou hláškou a údajmi, ktoré sa podarilo získať (aspoň identifikátor).
- Pri neznámom QR kóde sa ponúkne „Skenovať znova“ alebo „Vyplniť ručne“.
- Aplikácia nespadne.

### US-11 – Odhalenie duplicitného skenu
**Ako** používateľ **chcem**, aby ma aplikácia upozornila, keď som bloček už naskenoval, **aby** som ho neuložil dvakrát.

**Akceptačné kritériá:**
- Kontrola prebieha podľa identifikátora eKasa ešte pred dopytom do siete a naprieč firmami.
- Upozornenie uvádza interné číslo a názov firmy, v ktorej doklad je.
- Používateľ môže skenovať znova alebo otvoriť existujúci doklad.

### US-12 – Povolenie kamery až pri použití
**Ako** používateľ **chcem**, aby sa o povolenie kamery pýtala aplikácia až keď ho potrebuje, **aby** som vedel, prečo ho dávam.

**Akceptačné kritériá:**
- Obrazovka skenovania najprv vysvetlí, načo je kamera potrebná, a povolenie sa vyžiada tlačidlom.
- Pri trvalom odmietnutí sa ponúkne otvorenie nastavení telefónu.
- Aj bez povolenia je dostupné „Pridať doklad ručne“.

### US-13 – Blesk pri skenovaní
**Ako** používateľ **chcem** zapnúť blesk kamery, **aby** som vedel naskenovať QR kód aj za zlého osvetlenia.

**Akceptačné kritériá:**
- Tlačidlo „Blesk“ zapína a vypína svetlo; zapnutý stav je viditeľne označený.
- Po odchode z obrazovky sa blesk vypne.

### US-14 – Haptická odozva po skenovaní
**Ako** používateľ **chcem** cítiť potvrdenie po naskenovaní, **aby** som vedel, že sa kód načítal.

**Akceptačné kritériá:**
- Úspešný sken zavibruje potvrdzovacím vzorom; neznámy QR a duplicita varovným vzorom.
- Ak zariadenie vibráciu nepodporuje, aplikácia pokračuje bez chyby.

---

# EP-3 – Kategórie a automatické zaraďovanie

### US-15 – Výber kategórie pri doklade
**Ako** používateľ **chcem** priradiť doklad ku kategórii, **aby** som vedel, na čo som minul.

**Akceptačné kritériá:**
- K dispozícii sú predvolené kategórie Benzín, Potraviny, Domácnosť, Reštaurácie, Zdravie a Ostatné.
- Nový doklad má predvolene „Ostatné“, ak aplikácia nepozná obchod.
- Kategóriu možno zmeniť pri pridaní aj úprave.

### US-16 – Správa vlastných kategórií
**Ako** používateľ **chcem** pridávať, premenovať a mazať vlastné kategórie, **aby** zodpovedali mojim potrebám.

**Akceptačné kritériá:**
- Nová kategória dostane farbu; duplicitný názov (bez ohľadu na veľkosť písmen) sa odmietne s hláškou.
- Vlastnú kategóriu možno premenovať a zmazať s potvrdením; predvolené sa nemenia ani nemažú.
- Pri zmazaní sa doklady kategórie presunú do „Ostatné“ a zapamätané obchody zmazanej kategórie sa odstránia.

### US-17 – Zapamätanie kategórie pre obchod
**Ako** používateľ **chcem**, aby si aplikácia zapamätala kategóriu obchodu, **aby** som ju pri ďalšom doklade z toho istého obchodu nemusel vyberať.

**Akceptačné kritériá:**
- Obchod sa identifikuje podľa IČO, inak podľa normalizovaného názvu (bez diakritiky, malé písmená, jedna medzera).
- Po uložení sa dvojica obchod → kategória zapamätá.
- Pri novom doklade z rovnakého obchodu sa kategória predvyplní (pri ručnom zadaní po dopísaní názvu obchodu).
- Kategória, ktorú používateľ vybral sám, sa návrhom neprepíše.

---

# EP-4 – Firmy a číslovanie dokladov

### US-18 – Vytvorenie firmy
**Ako** používateľ **chcem** na začiatku vytvoriť firmu, pre ktorú budem evidovať bločky, **aby** boli doklady priradené správnemu subjektu.

**Akceptačné kritériá:**
- Pri prvom spustení bez firmy sa zobrazí uvítanie s výzvou vytvoriť firmu.
- Firma má názov a IČO (povinné; IČO len číslice) a nepovinné DIČ, IČ DPH a adresu.
- Pri firme sa zadávajú aj údaje na export do Pohody a číslovanie (pozri US-22, US-30).
- Nová firma sa rovno zvolí ako aktívna.

### US-19 – Prepínanie firiem
**Ako** používateľ **chcem** prepínať medzi firmami, **aby** som mohol evidovať bločky viacerých firiem.

**Akceptačné kritériá:**
- Názov aktívnej firmy je nad zoznamom dokladov a prehľadom; ťuknutím sa otvorí výber. Firmu možno zmeniť aj v Nastaveniach.
- Zvolená firma sa zapamätá aj po zatvorení aplikácie; ak je firma jediná, volí sa sama.
- Zoznam, prehľad, export aj nové doklady sa týkajú vždy len aktívnej firmy.

### US-20 – Úprava a zmazanie firmy
**Ako** používateľ **chcem** upraviť údaje firmy alebo ju zmazať, **aby** boli údaje aktuálne.

**Akceptačné kritériá:**
- Úprava otvorí formulár s vyplnenými údajmi.
- Firmu s dokladmi nemožno zmazať; aplikácia uvedie počet dokladov a požiada o ich zmazanie.
- Zmazanie prázdnej firmy vyžaduje potvrdenie.

### US-21 – Automatické interné číslo dokladu
**Ako** používateľ **chcem**, aby každý doklad dostal automaticky interné číslo, **aby** doklady tvorili číslovaný rad.

**Akceptačné kritériá:**
- Nový doklad má predvyplnené číslo z predpony a počítadla firmy (napr. `PD5`); po uložení sa počítadlo zvýši.
- Číslo možno prepísať; ak má tvar predpona + číslo a je vyššie než počítadlo, počítadlo preskočí za neho.
- Interné číslo je jedinečné v rámci firmy; duplicita sa odmietne s hláškou. Iná firma môže mať rovnaké číslo.
- Číslo možno ponechať prázdne.

### US-22 – Nastavenie číslovania s nulami
**Ako** používateľ **chcem** nastaviť predponu a počiatočné číslo vrátane núl na začiatku, **aby** čísla vyzerali napr. `26/V-001`.

**Akceptačné kritériá:**
- Predpona má 1 až 20 znakov bez medzier (môže obsahovať lomku a pomlčku).
- Ďalšie číslo je celé číslo od 1; zadanie `001` zachová 3 číslice (001, 002, 003…).
- Formulár zobrazí náhľad ďalšieho čísla.
- Každá firma má vlastné číslovanie.

### US-23 – Číslo dokladu z bločku
**Ako** používateľ **chcem** evidovať aj číslo dokladu z bločku, **aby** sa doklad dal dohľadať a použiť v účtovníctve.

**Akceptačné kritériá:**
- Číslo dokladu možno zadať ručne; pri QR sa predvyplní z eKasa (alebo z offline kódu).
- Je oddelené od interného čísla aj od dlhého identifikátora eKasa, ktorý slúži na odhalenie duplicít.
- Zobrazuje sa v detaile.

---

# EP-5 – DPH a sumy

### US-24 – Suma s DPH a bez DPH
**Ako** používateľ **chcem** evidovať sumu s DPH aj bez DPH, **aby** som poznal základ a daň.

**Akceptačné kritériá:**
- Suma bez DPH je nepovinná a nesmie byť väčšia než suma s DPH.
- Pri QR sa suma bez DPH vypočíta z odpovede eKasa; detail zobrazuje sumu bez DPH a DPH.

### US-25 – Rozpis DPH po sadzbách
**Ako** účtovník **chcem** mať pri doklade základ a DPH zvlášť za každú sadzbu, **aby** som ich vedel správne zaúčtovať.

**Akceptačné kritériá:**
- Pri QR sa rozpis načíta z odpovede eKasa vrátane viacerých sadzieb na jednom bločku; súčet základov a DPH zodpovedá sume s DPH.
- Pri ručnom doklade používateľ vyberie sadzbu podľa dátumu nákupu (od 2025: 23 / 19 / 5 % a bez DPH; do 2024: 20 / 10 % a bez DPH); základ a DPH sa dopočítajú a zobrazí sa náhľad.
- Rozpis z eKasa s viacerými sadzbami je len na čítanie a zmena sumy, ktorá by ho porušila, sa odmietne.
- Detail zobrazuje rozpis po sadzbách.

### US-26 – Upozornenie na doklady bez rozpisu DPH
**Ako** používateľ **chcem** vedieť, ktoré doklady nemajú rozpis DPH, **aby** som ho pred exportom doplnil.

**Akceptačné kritériá:**
- Obrazovka exportu uvádza počet dokladov bez rozpisu.
- Pred exportom sa zobrazí zoznam upozornení a export pokračuje len po potvrdení; také doklady sa exportujú ako bez DPH.

---

# EP-6 – Prehľady

### US-27 – Mesačný prehľad
**Ako** používateľ **chcem** vidieť výdavky za mesiac, **aby** som poznal ich výšku a štruktúru.

**Akceptačné kritériá:**
- Zobrazuje celkovú sumu, počet dokladov, súčty a podiel v % podľa kategórií a stĺpcový graf.
- Mesiace sa prepínajú šípkami; do budúcnosti sa prepnúť nedá.
- Suma bez DPH sa uvádza len z dokladov, kde je známa, s poznámkou, ak nie je pri všetkých.
- Súčty sedia s dokladmi v zozname pre daný mesiac a firmu.
- Mesiac bez dokladov ukáže prázdny stav.

### US-28 – Ročný prehľad
**Ako** používateľ **chcem** vidieť výdavky za celý rok, **aby** som mal prehľad aj dlhšieho obdobia.

**Akceptačné kritériá:**
- Prepínač Mesiac / Rok; šípky menia rok.
- Ročný pohľad obsahuje graf po mesiacoch (12 stĺpcov) so zoznamom mesiacov a sumami, a súčty podľa kategórií za rok.
- Súčet za rok sa rovná súčtu mesiacov.

---

# EP-7 – Export do Pohody

### US-29 – Export mesačného XML pre Pohodu
**Ako** účtovník **chcem** dostať XML súbor s dokladmi za mesiac, **aby** som ich naimportoval do Pohody bez prepisovania.

**Akceptačné kritériá:**
- Používateľ vyberie mesiac; vidí počet dokladov a súčet.
- Vznikne jeden súbor `InvoSpace_RRRR-MM.xml` v tvare Pohoda dataPack 2.0 s výdavkovými pokladničnými dokladmi.
- Doklad obsahuje: interné číslo ako požadované číslo dokladu, číslo z bločku ako pôvodný doklad, dátum, dodávateľa a IČO, pokladňu, položku za každú sadzbu DPH (základ a DPH) a poznámku.
- Doklady sú zoradené od najstaršieho; fotky sa neexportujú.
- Diakritika je zapísaná číselnými odkazmi, takže súbor je platný pri akomkoľvek kódovaní.
- Import do Pohody prebehne bez chyby (**overené v reálnej Pohode**).

### US-30 – Nastavenia exportu pri firme
**Ako** používateľ **chcem** zadať údaje pre Pohodu raz pri firme, **aby** sa ich aplikácia nepýtala pri každom exporte.

**Akceptačné kritériá:**
- Pri firme sa nastavuje IČO, skratka pokladne a nepovinná predvolená predkontácia.
- Ak chýba IČO alebo pokladňa, export to oznámi a ponúkne úpravu firmy.
- Obrazovka exportu zobrazuje údaje aktívnej firmy a odkaz na ich úpravu.

### US-31 – Predkontácia kategórie v texte dokladu
**Ako** účtovník **chcem**, aby predkontácia kategórie bola v poli Text dokladu, **aby** som podľa nej v Pohode vedel doklady filtrovať.

**Akceptačné kritériá:**
- Predkontáciu možno nastaviť pri každej kategórii (aj predvolenej) v Nastaveniach.
- Pri exporte sa Text dokladu rovná predkontácii kategórie; ak ju kategória nemá, Text je popis dokladu („Bloček …“).
- Predkontácia sa neposiela do položiek dokladu.
- Predvolená predkontácia firmy ostáva v hlavičke dokladu.

### US-32 – Bez duplicít pri opakovanom importe
**Ako** účtovník **chcem**, aby opakovaný import toho istého mesiaca doklady nezdvojil, **aby** sa účtovníctvo nepokazilo.

**Akceptačné kritériá:**
- Identifikátor balíka je pre mesiac stále rovnaký (`InvoSpace_<mesiac>`) a každý doklad má stabilný identifikátor, podľa ktorého Pohoda rozpozná už importované doklady.
- Aplikácia upozorňuje, že doklad upravený po importe treba opraviť aj v Pohode.

### US-33 – Zdieľanie exportu
**Ako** používateľ **chcem** poslať export cez systémové zdieľanie, **aby** sa súbor dostal k účtovníkovi (e-mail, OneDrive, Súbory).

**Akceptačné kritériá:**
- Po vytvorení súboru sa otvorí systémové menu zdieľania.
- Ak zdieľanie nie je dostupné alebo zlyhá, zobrazí sa hláška a aplikácia nespadne.

### US-34 – Platnosť XML voči schémam Stormware
**Ako** autor **chcem**, aby generované XML prešlo validáciou voči oficiálnym schémam, **aby** sa znížilo riziko odmietnutia importom.

**Akceptačné kritériá:**
- Testovacie XML (jednosadzbový doklad, viacsadzbový doklad, doklad bez rozpisu, špeciálne znaky a diakritika) je validné voči schémam Stormware (`data.xsd`, `voucher.xsd`, `type.xsd`).
- Dĺžky polí sú orezané podľa schémy; riadiace znaky sa odstránia.
- Pri zmene generátora sa validácia opakuje.

---

# EP-8 – Záloha a obnova dát

### US-35 – Záloha dát
**Ako** používateľ **chcem** zálohovať všetky dáta aj fotky do jedného súboru, **aby** som o ne neprišiel pri strate alebo výmene telefónu.

**Akceptačné kritériá:**
- V Nastaveniach je tlačidlo „Zálohovať dáta“; vznikne ZIP `InvoSpace_zaloha_RRRR-MM-DD.zip` s `data.json` (všetky tabuľky) a priečinkom `photos/`.
- Súbor sa ponúkne na zdieľanie a dá sa otvoriť aj na počítači.
- Aplikácia zobrazuje dátum poslednej zálohy a upozorní, že záloha nie je šifrovaná.
- Ak súbor niektorej fotky chýba, aplikácia to oznámi a údaje dokladu zálohuje.
- Fotky sa zapisujú po jednej, aby sa nezaplnila pamäť.

### US-36 – Obnova zo zálohy
**Ako** používateľ **chcem** obnoviť dáta zo zálohy, **aby** som ich dostal späť napríklad do nového telefónu.

**Akceptačné kritériá:**
- Pred obnovením sa zobrazí výrazné varovanie, že obnova nahradí všetky dáta v telefóne.
- Záloha sa najprv celá overí (štruktúra, verzia, kontrolné súčty fotiek); v tejto fáze sa aktuálne dáta nemenia.
- Výmena dát prebehne v jednej transakcii; pri chybe (vrátane porušenia väzieb) sa vráti späť a pôvodné dáta ostanú.
- Pôvodné fotky sa zmažú až po úspešnom zápise.
- Záloha z novšej verzie aplikácie, cudzí súbor, poškodený ZIP alebo ZIP prebalený iným programom sa odmietnu so zrozumiteľnou hláškou.
- Po obnove aplikácia ukáže počet firiem, dokladov a fotiek.

---

# EP-9 – Používateľský zážitok a spoľahlivosť

### US-37 – Prázdne stavy
**Ako** používateľ **chcem** pri prázdnej obrazovke vidieť, čo robiť ďalej, **aby** som nezostal bez rady.

**Akceptačné kritériá:**
- Zoznam bez dokladov: „Zatiaľ nemáš žiadne doklady“ s radou (skenovať alebo pridať ručne).
- Filter bez výsledku, obdobie prehľadu bez dokladov a výber firiem bez firmy majú vlastný text a ikonu.

### US-38 – Zrozumiteľné chyby a ochrana pred pádom
**Ako** používateľ **chcem**, aby aplikácia pri chybe nespadla a povedala mi, čo sa stalo, **aby** som mohol pokračovať.

**Akceptačné kritériá:**
- Chyby siete, súborov a databázy ukážu slovenskú hlášku; pri načítaní dát je tlačidlo „Skúsiť znova“.
- Chyba otvorenia databázy má vlastnú obrazovku namiesto zavádzajúcej výzvy vytvoriť firmu.
- Neočakávaná chyba obrazovky ukáže hlášku, že doklady ostali v telefóne, s tlačidlom na opakovanie.

### US-39 – Slovenské rozhranie a formáty
**Ako** používateľ **chcem**, aby bolo rozhranie po slovensky a sumy a dátumy v slovenských tvaroch, **aby** mi boli čitateľné.

**Akceptačné kritériá:**
- Všetky texty rozhrania sú po slovensky; mena je EUR.
- Suma sa zobrazuje ako `12,50 €`, dátum ako `3. 10. 2026`, mesiace slovenskými názvami.

### US-40 – Ikona a úvodná obrazovka
**Ako** autor **chcem**, aby mala aplikácia vlastnú ikonu a úvodnú obrazovku, **aby** pôsobila dokončene.

**Akceptačné kritériá:**
- Aplikácia má vlastnú ikonu (bloček na modrom pozadí) bez priehľadnosti a úvodný obrázok.
- Ikony sa dajú znovu vygenerovať skriptom v repozitári.

---

# EP-10 – Distribúcia a dokumentácia

### US-41 – Zdieľanie aplikácie s vybranými ľuďmi
**Ako** autor **chcem** aplikáciu zdieľať s vybranými ľuďmi, **aby** ju mohli vyskúšať.

**Akceptačné kritériá:**
- Projekt je na expo.dev pod organizáciou a publikovaný cez EAS Update; nahráva sa len kód, nie dáta používateľov.
- Pozvaní členovia organizácie ho otvoria v Expo Go cez odkaz alebo QR kód z dashboardu.
- Každý používateľ má dáta len vo svojom telefóne.
- Nová verzia sa publikuje jedným príkazom `eas update`.

### US-42 – Dokumentácia na obhajobu
**Ako** autor **chcem** mať projekt zdokumentovaný, **aby** som ho vedel vysvetliť a obhájiť.

**Akceptačné kritériá:**
- README (po slovensky) popisuje aplikáciu, technológie, štruktúru, dátový model, návod na spustenie a poznámku ku každej fáze.
- CLAUDE.md obsahuje pravidlá projektu a rozhodnutia zadávateľa.
- Dokumenty INITIATIVE, EPICS a USER STORIES sú v priečinku `docs/`.
- Zdrojový kód je v repozitári na GitHube.

---

# Nerealizované nápady (backlog)

Tieto požiadavky nie sú v dohodnutom rozsahu a nie sú implementované.

| ID | Nápad | Poznámka |
| --- | --- | --- |
| US-B1 | Hľadanie v dokladoch | napr. podľa dodávateľa alebo čísla |
| US-B2 | Hromadné mazanie dokladov | |
| US-B3 | Tmavý režim | |
| US-B4 | Presun dokladu medzi firmami | |
| US-B5 | Uloženie celej odpovede eKasa (položky bločku, podpisové kódy) | na účely archivácie |
| US-B6 | Šifrovanie zálohy | |
| US-B7 | Publikovanie v App Store | vyžaduje Apple Developer účet a zmenu pravidla o EAS Build |
