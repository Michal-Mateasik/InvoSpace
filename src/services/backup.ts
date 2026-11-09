import { File, FileMode, Paths } from 'expo-file-system';

import { dumpDatabase } from '@/db/backup';
import { toIsoDate } from '@/utils/format';
import { ZipWriter } from '@/utils/zip';

export type BackupResult = {
  uri: string;
  fileName: string;
  receiptCount: number;
  photoCount: number;
  missingPhotos: number; // fotky, ktoré sú v databáze, ale súbor v telefóne chýba
};

// Záloha je jeden ZIP súbor:
//   data.json  – všetky tabuľky (firmy, kategórie, doklady, rozpis DPH, nastavenia)
//   photos/…   – fotky bločkov
// V data.json je pri doklade `image_file` (relatívna cesta k fotke v ZIP) namiesto cesty v telefóne,
// ktorá by sa po obnovení na inom zariadení nezhodovala.
export async function createBackup(): Promise<BackupResult> {
  const dump = await dumpDatabase();
  const fileName = `InvoSpace_zaloha_${toIsoDate(new Date())}.zip`;

  const zipFile = new File(Paths.cache, fileName);
  zipFile.create({ overwrite: true });
  const handle = zipFile.open(FileMode.Truncate);
  try {
    // Synchrónny zápis: ZipWriter zapisuje postupne a poradie zápisov sa nesmie pomiešať.
    const zip = new ZipWriter((bytes) => handle.writeBytesSync(bytes));

    let photoCount = 0;
    let missingPhotos = 0;
    // Fotky pridávame po jednej, aby sa v pamäti naraz držala vždy len jedna.
    const receipts = [];
    for (const row of dump.tables.receipts) {
      const { image_uri, ...rest } = row as { image_uri: string | null } & Record<string, unknown>;
      let imageFile: string | null = null;
      if (image_uri) {
        const photo = new File(image_uri);
        if (photo.exists) {
          imageFile = `photos/${image_uri.split('/').pop()}`;
          zip.addFile(imageFile, await photo.bytes());
          photoCount++;
        } else {
          missingPhotos++;
        }
      }
      receipts.push({ ...rest, image_file: imageFile });
    }

    const data = {
      app: 'InvoSpace',
      format: 1,
      createdAt: new Date().toISOString(),
      schemaVersion: dump.schemaVersion,
      tables: { ...dump.tables, receipts },
    };
    zip.addFile('data.json', new TextEncoder().encode(JSON.stringify(data, null, 1)));
    zip.finish();

    return { uri: zipFile.uri, fileName, receiptCount: receipts.length, photoCount, missingPhotos };
  } finally {
    handle.close();
  }
}
