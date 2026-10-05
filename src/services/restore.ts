import { Directory, File, FileMode, Paths } from 'expo-file-system';

import { getDb, SCHEMA_VERSION } from '@/db/database';
import { buildInsert, parseBackupJson, RESTORE_TABLES, type Row } from '@/utils/backupFormat';
import { readZipEntries, readZipEntryData, ZipFormatError, type ZipSource } from '@/utils/zipReader';

import { deleteImage } from './files';

export type RestoreResult = {
  companies: number;
  receipts: number;
  photos: number;
  missingPhotos: number; // fotky, ktoré záloha pri doklade uvádza, ale v ZIP chýbajú
};

// Otvorí systémový výber súborov. Vráti null, ak používateľ výber zrušil.
export async function pickBackupFile(): Promise<File | null> {
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  return picked.canceled ? null : picked.result;
}

// Obnoví všetky dáta zo zálohy (ZIP z tlačidla Zálohovať dáta). Postup je poistený:
//  1. Záloha sa celá prečíta a overí (štruktúra aj kontrolné súčty fotiek) a fotky sa uložia
//     do nového priečinka. V tejto fáze sa aktuálne dáta v telefóne vôbec nemenia.
//  2. Až potom sa v jednej transakcii nahradí obsah databázy. Ak čokoľvek zlyhá, transakcia sa vráti
//     späť a pôvodné dáta ostanú nedotknuté.
//  3. Pôvodné fotky sa mažú až po úspešnom zápise.
export async function restoreFromBackup(file: File): Promise<RestoreResult> {
  const handle = file.open(FileMode.ReadOnly);
  const stagingDir = new Directory(Paths.document, `restored_${Date.now()}`);
  try {
    const source: ZipSource = {
      size: file.size,
      read: (offset, length) => {
        handle.offset = offset;
        return handle.readBytes(length);
      },
    };

    const entries = readZipEntries(source);
    const dataEntry = entries.find((e) => e.name === 'data.json');
    if (!dataEntry) throw new ZipFormatError('Vybraný súbor nie je záloha aplikácie InvoSpace.');
    const backup = parseBackupJson(new TextDecoder().decode(readZipEntryData(source, dataEntry)), SCHEMA_VERSION);

    // 1. Fotky do nového priečinka; každá sa overí kontrolným súčtom.
    stagingDir.create({ intermediates: true, idempotent: true });
    let photos = 0;
    let missingPhotos = 0;
    const receipts: Row[] = [];
    for (const row of backup.tables.receipts) {
      const { image_file, ...rest } = row as { image_file?: string | null } & Row;
      let imageUri: string | null = null;
      if (image_file) {
        const entry = entries.find((e) => e.name === image_file);
        if (entry) {
          // Z cesty berieme len názov súboru, aby záloha nemohla zapísať nikam mimo priečinka.
          const fileName = image_file.split('/').pop() as string;
          const target = new File(stagingDir, fileName);
          target.create({ overwrite: true });
          target.write(readZipEntryData(source, entry));
          imageUri = target.uri;
          photos++;
        } else {
          missingPhotos++;
        }
      }
      receipts.push({ ...rest, image_uri: imageUri });
    }

    // 2. Výmena obsahu databázy v jednej transakcii.
    const db = await getDb();
    const oldPhotos = (
      await db.getAllAsync<{ image_uri: string }>('SELECT image_uri FROM receipts WHERE image_uri IS NOT NULL')
    ).map((r) => r.image_uri);

    await db.withTransactionAsync(async () => {
      for (const table of [...RESTORE_TABLES].reverse()) {
        await db.runAsync(`DELETE FROM ${table}`);
      }
      for (const table of RESTORE_TABLES) {
        const columns = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name);
        const rows = table === 'receipts' ? receipts : backup.tables[table];
        for (const row of rows) {
          const { sql, values } = buildInsert(table, columns, row);
          await db.runAsync(sql, values as (string | number | null)[]);
        }
      }
      const broken = await db.getAllAsync('PRAGMA foreign_key_check');
      if (broken.length > 0) throw new ZipFormatError('Záloha je nekonzistentná (chýbajú súvisiace záznamy).');
    });

    // 3. Pôvodné fotky sa zmažú až teraz, keď je nové obsah bezpečne zapísaný.
    for (const uri of oldPhotos) deleteImage(uri);

    return {
      companies: backup.tables.companies.length,
      receipts: receipts.length,
      photos,
      missingPhotos,
    };
  } catch (error) {
    // Pri chybe zmažeme rozpracované fotky; pôvodné dáta sa nezmenili.
    try {
      if (stagingDir.exists) stagingDir.delete();
    } catch (cleanupError) {
      console.warn('Dočasný priečinok sa nepodarilo zmazať', cleanupError);
    }
    throw error;
  } finally {
    handle.close();
  }
}
