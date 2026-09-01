// src/services/nativeFileService.ts
// Serviço de ficheiros nativo usando Capacitor Filesystem

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const NativeFileService = {
  /**
   * Salva um PDF no dispositivo e retorna a URI
   */
  async savePDF(blob: Blob, fileName: string): Promise<string> {
    const base64 = await blobToBase64(blob);
    const path = `Biz-flow/${fileName}`;

    // Tenta salvar em Documents primeiro, fallback para Cache
    try {
      await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Documents,
      });
      return await Filesystem.getUri({
        path,
        directory: Directory.Documents,
      }).then(r => r.uri);
    } catch {
      // Fallback para cache
      await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Cache,
      });
      return await Filesystem.getUri({
        path,
        directory: Directory.Cache,
      }).then(r => r.uri);
    }
  },

  /**
   * Salva um PDF no cache e retorna a URI (para share temporário)
   */
  async savePDFToCache(blob: Blob, fileName: string): Promise<string> {
    const base64 = await blobToBase64(blob);
    const path = `temp/${fileName}`;

    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
    });

    return await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    }).then(r => r.uri);
  },

  /**
   * Lê um ficheiro como base64
   */
  async readFile(path: string, directory: Directory = Directory.Documents): Promise<string | null> {
    try {
      const result = await Filesystem.readFile({ path, directory });
      const data = result.data;
      return typeof data === 'string' ? data : null;
    } catch {
      return null;
    }
  },

  /**
   * Apaga um ficheiro
   */
  async deleteFile(path: string, directory: Directory = Directory.Cache): Promise<void> {
    try {
      await Filesystem.deleteFile({ path, directory });
    } catch {
      // Silencioso
    }
  },
};

// Utilitário: Blob → base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:application/pdf;base64," se existir
      const base64 = result.includes('base64,') ? result.split('base64,')[1]! : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
