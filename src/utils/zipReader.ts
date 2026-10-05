import { crc32 } from './zip';

// Čítač ZIP súborov, ktoré vytvára naša záloha (metóda „store“, bez kompresie).
// Číta po častiach cez `read`, takže sa celý súbor nenačíta do pamäte naraz.

export class ZipFormatError extends Error {}

export type ZipSource = {
  size: number;
  read: (offset: number, length: number) => Uint8Array;
};

export type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  crc: number;
  localOffset: number;
};

function readExactly(source: ZipSource, offset: number, length: number): Uint8Array {
  const bytes = source.read(offset, length);
  if (bytes.length !== length) throw new ZipFormatError('Súbor je poškodený alebo neúplný.');
  return bytes;
}

// Zoznam súborov v ZIP podľa centrálneho adresára na konci archívu.
export function readZipEntries(source: ZipSource): ZipEntry[] {
  if (source.size < 22) throw new ZipFormatError('Vybraný súbor nie je ZIP.');

  // Záznam „koniec archívu“ je posledných 22 bajtov (alebo o niečo skôr, ak má ZIP komentár).
  const tailLength = Math.min(source.size, 22 + 65535);
  const tail = readExactly(source, source.size - tailLength, tailLength);
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let end = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new ZipFormatError('Vybraný súbor nie je ZIP.');

  const count = tailView.getUint16(end + 10, true);
  const directorySize = tailView.getUint32(end + 12, true);
  const directoryOffset = tailView.getUint32(end + 16, true);
  if (count === 0xffff || directoryOffset === 0xffffffff) {
    throw new ZipFormatError('Tento typ ZIP súboru (ZIP64) nie je podporovaný.');
  }
  if (directoryOffset + directorySize > source.size) throw new ZipFormatError('Súbor je poškodený.');

  const directory = readExactly(source, directoryOffset, directorySize);
  const view = new DataView(directory.buffer, directory.byteOffset, directory.byteLength);
  const entries: ZipEntry[] = [];
  let pos = 0;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > directory.length || view.getUint32(pos, true) !== 0x02014b50) {
      throw new ZipFormatError('Súbor je poškodený.');
    }
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    entries.push({
      method: view.getUint16(pos + 10, true),
      crc: view.getUint32(pos + 16, true),
      compressedSize: view.getUint32(pos + 20, true),
      size: view.getUint32(pos + 24, true),
      localOffset: view.getUint32(pos + 42, true),
      name: new TextDecoder().decode(directory.subarray(pos + 46, pos + 46 + nameLength)),
    });
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

// Obsah jedného súboru. Overí kontrolný súčet (CRC), takže poškodená záloha sa odhalí ešte pred obnovením.
export function readZipEntryData(source: ZipSource, entry: ZipEntry): Uint8Array {
  if (entry.method !== 0) {
    throw new ZipFormatError('Záloha je skomprimovaná iným programom. Použi súbor priamo z aplikácie InvoSpace.');
  }
  const header = readExactly(source, entry.localOffset, 30);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  if (view.getUint32(0, true) !== 0x04034b50) throw new ZipFormatError('Súbor je poškodený.');
  const dataOffset = entry.localOffset + 30 + view.getUint16(26, true) + view.getUint16(28, true);

  const data = readExactly(source, dataOffset, entry.compressedSize);
  if (crc32(data) !== entry.crc) throw new ZipFormatError(`Súbor „${entry.name}“ v zálohe je poškodený.`);
  return data;
}
