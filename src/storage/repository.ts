import type {
  BackupMergeOptions,
  BackupRestoreResult,
} from '../crypto/backupCrypto';
import type {
  BackupPlainData,
  CurricoloCatalogEntry,
  DocxMappingSchema,
  LibraryItem,
  Programmazione,
  SchoolSettings,
  SuggestionRule,
} from '../domain/types';

export interface PianoramaRepository {
  init(): Promise<void>;

  // Programmazioni
  listProgrammazioni(): Promise<Programmazione[]>;
  getProgrammazione(id: string): Promise<Programmazione | undefined>;
  saveProgrammazione(plan: Programmazione): Promise<void>;
  deleteProgrammazione(id: string): Promise<void>;

  // Libreria contenuti locale
  listLibraryItems(): Promise<LibraryItem[]>;
  saveLibraryItem(item: LibraryItem): Promise<void>;
  deleteLibraryItem(id: string): Promise<void>;
  bulkImportLibraryItems(items: LibraryItem[]): Promise<void>;

  // Catalogo Curricolo Verticale
  getCurricoloCatalog(): Promise<CurricoloCatalogEntry[]>;
  saveCurricoloCatalog(items: CurricoloCatalogEntry[]): Promise<void>;
  resetDefaultCurricoloCatalog(): Promise<CurricoloCatalogEntry[]>;

  // Regole deterministiche
  listRules(): Promise<SuggestionRule[]>;
  saveRule(rule: SuggestionRule): Promise<void>;
  deleteRule(id: string): Promise<void>;
  resetDefaultRules(): Promise<SuggestionRule[]>;

  // Impostazioni & schema DOCX
  getSettings(): Promise<SchoolSettings>;
  saveSettings(settings: SchoolSettings): Promise<void>;
  getDocxMapping(): Promise<DocxMappingSchema>;
  saveDocxMapping(mapping: DocxMappingSchema): Promise<void>;
  resetDefaultDocxMapping(): Promise<DocxMappingSchema>;

  // Backup completo o unione con archivio attuale
  exportAllData(): Promise<BackupPlainData>;
  restoreAllData(
    data: BackupPlainData,
    options?: BackupMergeOptions
  ): Promise<BackupRestoreResult>;
}
