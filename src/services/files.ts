import { Directory, File, Paths } from 'expo-file-system';

// Fotka z kamery/galérie leží v dočasnom priečinku, ktorý systém môže vyčistiť.
// Preto ju kopírujeme do priečinka dokumentov aplikácie a do databázy ukladáme až túto cestu.
function getReceiptsDirectory(): Directory {
  const directory = new Directory(Paths.document, 'receipts');
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

export async function persistImage(tempUri: string): Promise<string> {
  const extension = tempUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const destination = new File(getReceiptsDirectory(), `receipt_${Date.now()}.${extension}`);
  await new File(tempUri).copy(destination);
  return destination.uri;
}

// Zapíše text do súboru v dočasnom priečinku (na zdieľanie) a vráti jeho cestu.
// Existujúci súbor s rovnakým názvom sa prepíše.
export function writeTempTextFile(fileName: string, content: string): string {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  return file.uri;
}

// Chyba pri mazaní súboru nesmie zhodiť aplikáciu; najhoršie ostane v telefóne nepoužitý súbor.
export function deleteImage(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Súbor sa nepodarilo zmazať', error);
  }
}
