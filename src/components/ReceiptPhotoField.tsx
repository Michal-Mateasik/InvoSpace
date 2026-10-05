import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Linking, StyleSheet, View } from 'react-native';

import { colors } from '@/utils/colors';

import { Button } from './Button';

type Props = {
  uri: string | null;
  onChange: (uri: string | null) => void;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7, // menší súbor, text na bločku ostáva čitateľný
};

export function ReceiptPhotoField({ uri, onChange }: Props) {
  async function takePhoto() {
    try {
      // O povolenie žiadame až teraz, keď ho naozaj potrebujeme.
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Kamera nie je povolená',
          'Na odfotenie dokladu potrebuje aplikácia prístup ku kamere. Povoliť ho môžeš v nastaveniach.',
          [
            { text: 'Zrušiť', style: 'cancel' },
            { text: 'Otvoriť nastavenia', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled) onChange(result.assets[0].uri);
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', 'Fotku sa nepodarilo urobiť.');
    }
  }

  async function pickFromLibrary() {
    try {
      // Systémový výber fotiek na iPhone nevyžaduje povolenie ku galérii.
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (!result.canceled) onChange(result.assets[0].uri);
    } catch (error) {
      console.error(error);
      Alert.alert('Chyba', 'Fotku sa nepodarilo načítať z galérie.');
    }
  }

  return (
    <View style={styles.container}>
      {uri && <Image source={{ uri }} style={styles.preview} resizeMode="cover" />}
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button title="Odfotiť" variant="secondary" onPress={takePhoto} />
        </View>
        <View style={styles.flex}>
          <Button title="Z galérie" variant="secondary" onPress={pickFromLibrary} />
        </View>
      </View>
      {uri && <Button title="Odstrániť fotku" variant="danger" onPress={() => onChange(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  preview: { width: '100%', height: 220, borderRadius: 12, backgroundColor: colors.surface },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
