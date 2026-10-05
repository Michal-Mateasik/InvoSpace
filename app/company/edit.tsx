import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { useCompany } from '@/context/CompanyContext';
import { countCompanyReceipts, deleteCompany, getCompany, insertCompany, updateCompany } from '@/db/companies';
import type { CompanyInput } from '@/types';
import { colors } from '@/utils/colors';
import { formatInternalNumber, widthFromText } from '@/utils/internalNumber';

// Jedna obrazovka na vytvorenie aj úpravu firmy: ak príde parameter `id`, ide o úpravu.
export default function CompanyEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const { active, reload, selectCompany } = useCompany();

  const [name, setName] = useState('');
  const [ico, setIco] = useState('');
  const [dic, setDic] = useState('');
  const [icDph, setIcDph] = useState('');
  const [address, setAddress] = useState('');
  const [cashAccount, setCashAccount] = useState('');
  const [accounting, setAccounting] = useState('');
  const [prefix, setPrefix] = useState('PD');
  const [next, setNext] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingId === null) return;
    getCompany(editingId)
      .then((company) => {
        if (!company) {
          Alert.alert('Firma sa nenašla');
          router.back();
          return;
        }
        setName(company.name);
        setIco(company.ico);
        setDic(company.dic ?? '');
        setIcDph(company.ic_dph ?? '');
        setAddress(company.address ?? '');
        setCashAccount(company.pohoda_cash_account);
        setAccounting(company.pohoda_accounting);
        setPrefix(company.internal_prefix);
        setNext(String(company.internal_next).padStart(company.internal_width, '0'));
      })
      .catch((e) => {
        console.error(e);
        Alert.alert('Chyba', 'Údaje firmy sa nepodarilo načítať.');
      });
  }, [editingId, router]);

  async function handleSave() {
    const cleanName = name.trim();
    const cleanIco = ico.replace(/\s/g, '');
    const cleanPrefix = prefix.trim();

    if (!cleanName) return Alert.alert('Chýba názov', 'Zadaj názov firmy.');
    if (!/^\d{1,15}$/.test(cleanIco)) {
      return Alert.alert('Neplatné IČO', 'IČO má obsahovať len číslice, napríklad 12345678.');
    }
    if (!cleanPrefix || cleanPrefix.length > 20 || /\s/.test(cleanPrefix)) {
      return Alert.alert('Neplatná predpona', 'Predpona má mať 1 až 20 znakov bez medzier, napríklad PD alebo 26/V-.');
    }
    if (!/^\d{1,9}$/.test(next.trim()) || Number(next) < 1) {
      return Alert.alert('Neplatné číslo', 'Ďalšie číslo musí byť celé číslo od 1, napríklad 1 alebo 001.');
    }

    const input: CompanyInput = {
      name: cleanName,
      ico: cleanIco,
      dic: dic.trim() || null,
      ic_dph: icDph.trim() || null,
      address: address.trim() || null,
      pohoda_cash_account: cashAccount.trim(),
      pohoda_accounting: accounting.trim(),
      internal_prefix: cleanPrefix,
      internal_next: Number(next),
      internal_width: widthFromText(next), // „001“ si zapamätá 3 číslice, aby sa nuly nestratili
    };

    setSaving(true);
    try {
      if (editingId === null) {
        const newId = await insertCompany(input);
        await reload();
        await selectCompany(newId); // novú firmu rovno zvolíme, aby sa pod ňu dali pridávať bločky
        router.dismissTo('/');
      } else {
        await updateCompany(editingId, input);
        await reload();
        router.back();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Firmu sa nepodarilo uložiť. Skús to prosím znova.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (editingId === null) return;
    try {
      const count = await countCompanyReceipts(editingId);
      if (count > 0) {
        Alert.alert(
          'Firmu nemožno zmazať',
          `Firma má ${count} ${count === 1 ? 'doklad' : 'dokladov'}. Najprv zmaž jej doklady.`
        );
        return;
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Firmu sa nepodarilo skontrolovať.');
      return;
    }
    Alert.alert('Zmazať firmu?', `Firma „${name}“ sa nenávratne zmaže.`, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCompany(editingId);
            await reload();
            // Po zmazaní aktívnej firmy sa treba rozhodnúť, ktorú použiť ďalej.
            if (active?.id === editingId) router.replace('/companies');
            else router.back();
          } catch (e) {
            console.error(e);
            Alert.alert('Chyba', 'Firmu sa nepodarilo zmazať.');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Stack.Screen options={{ title: editingId === null ? 'Nová firma' : 'Úprava firmy' }} />

      <Text style={styles.section}>Údaje o firme</Text>
      <Field label="Názov firmy">
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Napríklad Moja s.r.o." />
      </Field>
      <Field label="IČO">
        <TextInput
          style={styles.input}
          value={ico}
          onChangeText={setIco}
          keyboardType="number-pad"
          placeholder="12345678"
        />
      </Field>
      <Field label="DIČ (nepovinné)">
        <TextInput style={styles.input} value={dic} onChangeText={setDic} keyboardType="number-pad" />
      </Field>
      <Field label="IČ DPH (nepovinné)">
        <TextInput
          style={styles.input}
          value={icDph}
          onChangeText={setIcDph}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="SK1234567890"
        />
      </Field>
      <Field label="Adresa (nepovinné)">
        <TextInput style={styles.input} value={address} onChangeText={setAddress} />
      </Field>

      <Text style={[styles.section, styles.sectionGap]}>Export do Pohody</Text>
      <Field label="Pokladňa (skratka)" hint="Skratka pokladne v Pohode, napr. HP. Bez nej sa nedá exportovať.">
        <TextInput
          style={styles.input}
          value={cashAccount}
          onChangeText={setCashAccount}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="napr. HP"
        />
      </Field>
      <Field
        label="Predvolená predkontácia (nepovinné)"
        hint="Skutočná predkontácia dokladu v Pohode. Predkontácia kategórie (Nastavenia, pri kategóriách) sa neposiela ako predkontácia, ale ako Text dokladu na filtrovanie. Ak nie je nič, doplníš ju v Pohode po importe."
      >
        <TextInput
          style={styles.input}
          value={accounting}
          onChangeText={setAccounting}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="napr. 6Pv"
        />
      </Field>

      <Text style={[styles.section, styles.sectionGap]}>Číslovanie dokladov</Text>
      <Text style={styles.hint}>
        Nový doklad dostane číslo predpona + poradové číslo (napr. PD5 alebo 26/V-001) a počítadlo sa samo
        zvýši. Nuly na začiatku čísla sa zachovajú: ak zadáš „001“, čísla budú 001, 002, 003… Každá firma má
        vlastný rad. Číselný rad pokladne v Pohode musí mať rovnakú predponu.
      </Text>
      <View style={styles.numberingRow}>
        <View style={styles.flex}>
          <Field label="Predpona">
            <TextInput
              style={styles.input}
              value={prefix}
              onChangeText={setPrefix}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="napr. 26/V-"
              maxLength={20}
            />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Ďalšie číslo">
            <TextInput
              style={styles.input}
              value={next}
              onChangeText={setNext}
              keyboardType="number-pad"
              placeholder="napr. 001"
              maxLength={9}
            />
          </Field>
        </View>
      </View>
      {/^\d{1,9}$/.test(next.trim()) && Number(next) >= 1 && prefix.trim() !== '' && (
        <Text style={styles.hint}>
          Ďalší doklad dostane číslo {formatInternalNumber(prefix.trim(), Number(next), widthFromText(next))}.
        </Text>
      )}

      <Button title={saving ? 'Ukladám…' : 'Uložiť'} onPress={handleSave} disabled={saving} />
      {editingId !== null && <Button title="Zmazať firmu" variant="danger" onPress={handleDelete} />}
    </ScrollView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  section: { fontSize: 14, fontWeight: '600', color: colors.muted },
  sectionGap: { marginTop: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  numberingRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
