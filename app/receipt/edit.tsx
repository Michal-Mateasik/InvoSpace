import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { CategoryChips } from '@/components/CategoryChips';
import { ReceiptPhotoField } from '@/components/ReceiptPhotoField';
import { useCompany } from '@/context/CompanyContext';
import { getAllCategories } from '@/db/categories';
import { getSuggestedInternalNumber, isInternalNumberTaken } from '@/db/numbering';
import { getReceipt, insertReceipt, updateReceipt } from '@/db/receipts';
import { getVatRows } from '@/db/vat';
import { rememberCategory, suggestCategoryId } from '@/services/categorize';
import { deleteImage, persistImage } from '@/services/files';
import type { Category, VatRow } from '@/types';
import { colors } from '@/utils/colors';
import { centsToInput, formatAmount, fromIsoDate, parseAmountToCents, toIsoDate } from '@/utils/format';
import { computeVatRows, ratesForDate, splitGross } from '@/utils/vat';

// Parametre trasy sú vždy texty. Okrem `id` (úprava) ich posiela obrazovka skenovania
// na predvyplnenie nového dokladu údajmi z QR kódu.
type Params = {
  id?: string;
  ekasaId?: string;
  receiptNumber?: string;
  amountCents?: string;
  vatRows?: string; // JSON pole riadkov rozpisu DPH z eKasa
  date?: string;
  merchant?: string;
  ico?: string;
  source?: string;
  notice?: string;
};

// Jedna obrazovka na pridanie aj úpravu: ak príde parameter `id`, ide o úpravu.
export default function ReceiptEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const editingId = params.id ? Number(params.id) : null;
  const source = params.source === 'qr' ? 'qr' : 'manual';
  const { active } = useCompany();
  // Nový doklad patrí aktívnej firme; pri úprave ostáva pri firme, ku ktorej už patrí.
  const [companyId, setCompanyId] = useState<number | null>(active?.id ?? null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [amountText, setAmountText] = useState('');
  const [netAmountText, setNetAmountText] = useState('');
  // Sadzba DPH zvolená čipom (jednosadzbový doklad) a rozpis z eKasa s viacerými sadzbami (len na čítanie).
  const [rate, setRate] = useState<number | null>(null);
  const [fixedRows, setFixedRows] = useState<VatRow[] | null>(null);
  const [date, setDate] = useState(new Date());
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [internalNumber, setInternalNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  // Pôvodná fotka dokladu; podľa nej zistíme, či sa fotka zmenila a či treba starý súbor zmazať.
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // IČO máme len pri doklade z QR kódu; podľa neho sa pamätá kategória obchodu.
  const [merchantIco, setMerchantIco] = useState<string | null>(params.ico ?? null);
  // Ak používateľ kategóriu vybral sám, návrh podľa obchodu ju už neprepíše.
  const categoryTouched = useRef(false);

  // Pri novom doklade po zadaní obchodu predvyplníme kategóriu, ktorú sme preňho už použili.
  async function suggestCategoryForMerchant() {
    if (editingId !== null || categoryTouched.current) return;
    try {
      const suggested = await suggestCategoryId(merchantIco, merchant);
      if (suggested !== null && !categoryTouched.current) setCategoryId(suggested);
    } catch (e) {
      console.warn('Návrh kategórie zlyhal', e); // nie je kritické, používateľ ju vyberie ručne
    }
  }

  // Rozpis DPH z eKasa s jednou sadzbou sa zobrazí ako zvolený čip a základ; s viacerými sadzbami
  // ostane len na čítanie, aby sa nerozbil súčet.
  function applyVatRows(rows: VatRow[]) {
    if (rows.length > 1) {
      setFixedRows(rows);
    } else if (rows.length === 1) {
      setRate(rows[0].rate);
      setNetAmountText(centsToInput(rows[0].base_cents));
    }
  }

  function selectCategory(id: number) {
    categoryTouched.current = true;
    setCategoryId(id);
  }

  useEffect(() => {
    async function load() {
      try {
        const loadedCategories = await getAllCategories();
        setCategories(loadedCategories);

        if (editingId === null) {
          // Nový doklad: predvyplníme „Ostatné“, aby kategória nezostala prázdna.
          const fallbackId = loadedCategories.find((c) => c.name === 'Ostatné')?.id ?? null;
          // Interné číslo sa navrhne automaticky (PD1, PD2, …); používateľ ho môže prepísať.
          if (companyId !== null) setInternalNumber(await getSuggestedInternalNumber(companyId));

          // Údaje z QR kódu (ak prišli) predvyplnia formulár.
          if (params.amountCents && Number(params.amountCents) > 0) {
            setAmountText(centsToInput(Number(params.amountCents)));
          }
          if (params.vatRows) {
            try {
              applyVatRows(JSON.parse(params.vatRows) as VatRow[]);
            } catch (e) {
              console.warn('Rozpis DPH z QR sa nepodarilo prečítať', e);
            }
          }
          if (params.date) setDate(fromIsoDate(params.date));
          if (params.merchant) setMerchant(params.merchant);
          if (params.receiptNumber) setReceiptNumber(params.receiptNumber);

          // Obchod, ktorý už poznáme (podľa IČO alebo názvu), dostane svoju kategóriu.
          const suggested = await suggestCategoryId(params.ico ?? null, params.merchant ?? null);
          setCategoryId(suggested ?? fallbackId);
          return;
        }
        const receipt = await getReceipt(editingId);
        if (!receipt) {
          Alert.alert('Doklad sa nenašiel');
          router.back();
          return;
        }
        setAmountText(centsToInput(receipt.amount_cents));
        setCompanyId(receipt.company_id);
        const savedRows = await getVatRows(editingId);
        if (savedRows.length > 0) applyVatRows(savedRows);
        else if (receipt.amount_net_cents !== null) setNetAmountText(centsToInput(receipt.amount_net_cents));
        setDate(fromIsoDate(receipt.purchase_date));
        setMerchant(receipt.merchant_name ?? '');
        setCategoryId(receipt.category_id);
        setNote(receipt.note ?? '');
        setInternalNumber(receipt.internal_number ?? '');
        setReceiptNumber(receipt.receipt_number ?? '');
        setMerchantIco(receipt.merchant_ico);
        setImageUri(receipt.image_uri);
        setOriginalImageUri(receipt.image_uri);
      } catch (e) {
        console.error(e);
        Alert.alert('Chyba', 'Údaje sa nepodarilo načítať.');
      }
    }
    load();
  }, [editingId, router]);

  async function handleSave() {
    const amountCents = parseAmountToCents(amountText);
    if (amountCents === null) {
      Alert.alert('Neplatná suma', 'Zadaj sumu väčšiu ako 0, napríklad 12,50.');
      return;
    }

    if (companyId === null) {
      Alert.alert('Chýba firma', 'Najprv zvoľ firmu, pre ktorú doklad evidujeme.');
      return;
    }
    const vat = computeVatRows({ grossCents: amountCents, netText: netAmountText, rate, fixedRows });
    if (vat.error) {
      Alert.alert('Neplatná suma bez DPH', vat.error);
      return;
    }

    setSaving(true);
    const imageChanged = imageUri !== originalImageUri;
    let savedImageUri = imageUri;
    try {
      const cleanInternalNumber = internalNumber.trim() || null;
      if (cleanInternalNumber && (await isInternalNumberTaken(companyId, cleanInternalNumber, editingId))) {
        Alert.alert('Číslo už existuje', `Interné číslo ${cleanInternalNumber} už má iný doklad. Zadaj iné.`);
        setSaving(false);
        return;
      }

      // Nová fotka je v dočasnom priečinku, preto ju najprv skopírujeme na trvalé miesto.
      if (imageUri && imageChanged) savedImageUri = await persistImage(imageUri);

      const values = {
        purchase_date: toIsoDate(date),
        amount_cents: amountCents,
        amount_net_cents: vat.netCents,
        merchant_name: merchant.trim() || null,
        category_id: categoryId,
        image_uri: savedImageUri,
        receipt_number: receiptNumber.trim() || null,
        internal_number: cleanInternalNumber,
        note: note.trim() || null,
      };

      if (editingId === null) {
        await insertReceipt(
          {
            ...values,
            company_id: companyId,
            merchant_ico: merchantIco,
            ekasa_receipt_id: params.ekasaId ?? null,
            source,
          },
          vat.rows
        );
      } else {
        await updateReceipt(editingId, values, vat.rows);
      }

      // Starý súbor mažeme až po úspešnom zápise do databázy.
      if (imageChanged) deleteImage(originalImageUri);

      // Doklad je už uložený, zlyhanie zapamätania kategórie preto nesmie hlásiť chybu uloženia.
      try {
        await rememberCategory(merchantIco, values.merchant_name, categoryId);
      } catch (e) {
        console.warn('Kategóriu obchodu sa nepodarilo zapamätať', e);
      }
      router.back();
    } catch (e) {
      console.error(e);
      // Uložená kópia fotky by zostala bez dokladu, preto ju zmažeme.
      if (imageChanged && savedImageUri && savedImageUri !== imageUri) deleteImage(savedImageUri);
      Alert.alert('Chyba', 'Doklad sa nepodarilo uložiť. Skús to prosím znova.');
      setSaving(false);
    }
  }

  // Čipy so sadzbami platnými v deň nákupu; už zvolená sadzba ostane, aj keď sa dátum zmení.
  const rateOptions = ratesForDate(toIsoDate(date));
  if (rate !== null && !rateOptions.includes(rate)) rateOptions.unshift(rate);

  // Náhľad: koľko vychádza základ a DPH pri zvolenej sadzbe.
  let vatPreview: string | null = null;
  const previewGross = parseAmountToCents(amountText);
  if (rate !== null && previewGross !== null) {
    const typedNet = parseAmountToCents(netAmountText);
    const row =
      rate === 0
        ? splitGross(previewGross, 0, previewGross)
        : splitGross(previewGross, rate, typedNet !== null && typedNet <= previewGross ? typedNet : undefined);
    vatPreview = `Základ ${formatAmount(row.base_cents)} · DPH ${formatAmount(row.vat_cents)}`;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Stack.Screen options={{ title: editingId === null ? 'Nový doklad' : 'Úprava dokladu' }} />

      {editingId === null && active && (
        <Text style={styles.companyLine}>Firma: {active.name}</Text>
      )}

      {params.notice && editingId === null && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{params.notice}</Text>
        </View>
      )}

      <Field label="Fotka dokladu">
        <ReceiptPhotoField uri={imageUri} onChange={setImageUri} />
      </Field>

      <Field label="Interné číslo">
        <TextInput
          style={styles.input}
          value={internalNumber}
          onChangeText={setInternalNumber}
          placeholder="Napríklad PD1"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </Field>

      <Field label="Suma s DPH (€)">
        <TextInput
          style={styles.input}
          value={amountText}
          onChangeText={setAmountText}
          placeholder="12,50"
          keyboardType="decimal-pad"
        />
      </Field>

      <Field label="DPH">
        {fixedRows ? (
          <View style={styles.vatBox}>
            {fixedRows.map((row) => (
              <Text key={row.rate} style={styles.vatLine}>
                {row.rate === 0 ? 'Bez DPH' : `${row.rate} %`}: základ {formatAmount(row.base_cents)}, DPH{' '}
                {formatAmount(row.vat_cents)}
              </Text>
            ))}
            <Text style={styles.vatHint}>Rozpis z eKasa, nedá sa upraviť.</Text>
          </View>
        ) : (
          <>
            <View style={styles.rateRow}>
              {rateOptions.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setRate(rate === value ? null : value)}
                  style={[styles.rateChip, rate === value && styles.rateChipActive]}
                >
                  <Text style={[styles.rateLabel, rate === value && styles.rateLabelActive]}>
                    {value === 0 ? 'Bez DPH' : `${value} %`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={netAmountText}
              onChangeText={setNetAmountText}
              placeholder="Suma bez DPH (€, nepovinné)"
              keyboardType="decimal-pad"
            />
            {vatPreview && <Text style={styles.vatHint}>{vatPreview}</Text>}
          </>
        )}
      </Field>

      <Field label="Dátum nákupu">
        <View style={styles.dateRow}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            locale="sk-SK"
            onValueChange={(_event, selected) => setDate(selected)}
          />
        </View>
      </Field>

      <Field label="Dodávateľ">
        <TextInput
          style={styles.input}
          value={merchant}
          onChangeText={setMerchant}
          onEndEditing={suggestCategoryForMerchant}
          placeholder="Napríklad Tesco"
        />
      </Field>

      <Field label="Číslo dokladu">
        <TextInput
          style={styles.input}
          value={receiptNumber}
          onChangeText={setReceiptNumber}
          placeholder="Z QR kódu alebo z bločku"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </Field>

      <Field label="Kategória">
        <CategoryChips categories={categories} selectedId={categoryId} onSelect={selectCategory} />
      </Field>

      <Field label="Poznámka (nepovinné)">
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          multiline
        />
      </Field>

      <Button title={saving ? 'Ukladám…' : 'Uložiť'} onPress={handleSave} disabled={saving} />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 18, paddingBottom: 40 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  dateRow: { alignItems: 'flex-start' },
  rateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rateLabel: { fontSize: 14, color: colors.text },
  rateLabelActive: { color: '#FFFFFF', fontWeight: '600' },
  vatBox: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, gap: 4 },
  vatLine: { fontSize: 14, color: colors.text },
  vatHint: { fontSize: 13, color: colors.muted },
  companyLine: { fontSize: 14, color: colors.muted },
  notice: { backgroundColor: '#FFF4D6', borderRadius: 10, padding: 12 },
  noticeText: { fontSize: 14, color: colors.text },
});
