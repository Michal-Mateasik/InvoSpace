// Minimálny zapisovač ZIP súborov bez kompresie (metóda „store“). Fotky sú už skomprimované (JPEG),
// takže kompresia by nič neušetrila. Súbor sa zapisuje postupne cez `write`, po jednom súbore naraz,
// aby sa pri veľa fotkách nenaplnila pamäť telefónu. Výsledok otvorí každý bežný program na ZIP.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Entry = { name: Uint8Array; crc: number; size: number; offset: number };

export class ZipWriter {
  private write: (bytes: Uint8Array) => void;
  private offset = 0;
  private entries: Entry[] = [];
  private dosTime: number;
  private dosDate: number;

  constructor(write: (bytes: Uint8Array) => void, now: Date = new Date()) {
    this.write = write;
    this.dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    this.dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  }

  private emit(bytes: Uint8Array) {
    this.write(bytes);
    this.offset += bytes.length;
  }

  // Názov súboru v ZIP je v UTF-8 (príznak 0x0800), takže funguje aj diakritika.
  addFile(path: string, data: Uint8Array) {
    const name = new TextEncoder().encode(path);
    const crc = crc32(data);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // podpis lokálnej hlavičky
    view.setUint16(4, 20, true); // potrebná verzia
    view.setUint16(6, 0x0800, true); // príznaky: UTF-8 názov
    view.setUint16(8, 0, true); // metóda: store
    view.setUint16(10, this.dosTime, true);
    view.setUint16(12, this.dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true); // veľkosť v ZIP
    view.setUint32(22, data.length, true); // pôvodná veľkosť
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true); // bez extra poľa
    header.set(name, 30);

    this.entries.push({ name, crc, size: data.length, offset: this.offset });
    this.emit(header);
    this.emit(data);
  }

  // Zapíše centrálny adresár a koniec archívu. Po zavolaní sa už nič nepridáva.
  finish() {
    const directoryStart = this.offset;
    for (const entry of this.entries) {
      const record = new Uint8Array(46 + entry.name.length);
      const view = new DataView(record.buffer);
      view.setUint32(0, 0x02014b50, true); // podpis záznamu adresára
      view.setUint16(4, 20, true); // vytvorené vo verzii
      view.setUint16(6, 20, true); // potrebná verzia
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, this.dosTime, true);
      view.setUint16(14, this.dosDate, true);
      view.setUint32(16, entry.crc, true);
      view.setUint32(20, entry.size, true);
      view.setUint32(24, entry.size, true);
      view.setUint16(28, entry.name.length, true);
      view.setUint16(30, 0, true); // extra pole
      view.setUint16(32, 0, true); // komentár
      view.setUint16(34, 0, true); // číslo disku
      view.setUint16(36, 0, true); // vnútorné atribúty
      view.setUint32(38, 0, true); // vonkajšie atribúty
      view.setUint32(42, entry.offset, true); // pozícia lokálnej hlavičky
      record.set(entry.name, 46);
      this.emit(record);
    }
    const directorySize = this.offset - directoryStart;

    const end = new Uint8Array(22);
    const view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true); // podpis konca archívu
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, this.entries.length, true);
    view.setUint16(10, this.entries.length, true);
    view.setUint32(12, directorySize, true);
    view.setUint32(16, directoryStart, true);
    view.setUint16(20, 0, true); // komentár
    this.emit(end);
  }
}
