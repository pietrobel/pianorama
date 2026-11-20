import Dexie, { type Table } from 'dexie';
import defaultMappingRaw from '../data/defaultDocxMapping.json';
import defaultRulesRaw from '../data/defaultRules.json';
import { CURRICOLO_VERTICALE_SEED } from '../data/curricoloCatalogSeed';
import { buildDefaultLibraryItems } from '../data/curricoloSeed';
import {
  DEFAULT_SCHOOL_SETTINGS,
  DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
} from '../domain/defaults';
import type {
  BackupPlainData,
  CurricoloCatalogEntry,
  DocxMappingSchema,
  LibraryItem,
  Programmazione,
  SchoolSettings,
  SuggestionRule,
} from '../domain/types';
import { ensureClassDimensions } from '../engine/classCharacteristicsEngine';
import { getDefaultIndicazioniForClasseAndYear } from '../engine/curricoloCatalogEngine';
import { normalizeQuickClassSelection } from '../engine/quickClassDescriptionEngine';
import {
  computeMergedProgrammazioni,
  mergeItemsById,
  type BackupMergeOptions,
  type BackupRestoreResult,
} from '../crypto/backupCrypto';
import type { PianoramaRepository } from './repository';

interface KeyValueRecord {
  key: string;
  value: unknown;
}

function normalizeLoadedPlan(plan: Programmazione): Programmazione {
  return {
    ...plan,
    datiGenerali: {
      ...plan.datiGenerali,
      docenteGenere: plan.datiGenerali?.docenteGenere,
      layoutDocumento: plan.datiGenerali?.layoutDocumento,
    },
    situazione: {
      ...plan.situazione,
      caratteristicheDimensioni: ensureClassDimensions(plan.situazione?.caratteristicheDimensioni),
    },
    analisiPartenza: {
      ...plan.analisiPartenza,
      questionario: plan.analisiPartenza?.questionario
        ? {
            ...plan.analisiPartenza.questionario,
            modalitaRapida: plan.analisiPartenza.questionario.modalitaRapida
              ? normalizeQuickClassSelection(plan.analisiPartenza.questionario.modalitaRapida)
              : undefined,
          }
        : undefined,
    },
    curricolo: {
      ...plan.curricolo,
      indicazioniVersione:
        plan.curricolo?.indicazioniVersione ??
        getDefaultIndicazioniForClasseAndYear(
          plan.datiGenerali?.classe ?? 'Prima',
          plan.datiGenerali?.annoScolastico
        ),
    },
  };
}

class PianoramaDexieDB extends Dexie {
  programmazioni!: Table<Programmazione, string>;
  library!: Table<LibraryItem, string>;
  rules!: Table<SuggestionRule, string>;
  kv!: Table<KeyValueRecord, string>;

  constructor() {
    super('PianoramaLocalDB');
    this.version(1).stores({
      programmazioni:
        'id, stato, updatedAt, datiGenerali.annoScolastico, datiGenerali.classe, datiGenerali.disciplina',
      library: 'id, categoria, disciplina, classe, archiviato, updatedAt',
      rules: 'id, attiva, priorita',
      kv: 'key',
    });
  }
}

function normalizeStorageError(err: unknown): Error {
  if (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return new Error(
      'Spazio di archiviazione locale esaurito nel browser. Esporta un backup .pianorama ed elimina o archivia i piani non più necessari.'
    );
  }
  if (err instanceof Error) return err;
  return new Error('Errore imprevisto durante l’accesso allo storage locale.');
}

const DEFAULT_MAPPING = defaultMappingRaw as DocxMappingSchema;
const DEFAULT_RULES = defaultRulesRaw as SuggestionRule[];

export class DexiePianoramaRepository implements PianoramaRepository {
  private db: PianoramaDexieDB;
  private initialized = false;

  constructor() {
    this.db = new PianoramaDexieDB();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.db.open();

      const libCount = await this.db.library.count();
      if (libCount === 0) {
        await this.db.library.bulkPut(buildDefaultLibraryItems());
      }

      const rulesCount = await this.db.rules.count();
      if (rulesCount === 0) {
        await this.db.rules.bulkPut(DEFAULT_RULES);
      }

      const settingsRow = await this.db.kv.get('settings');
      if (!settingsRow) {
        await this.db.kv.put({ key: 'settings', value: DEFAULT_SCHOOL_SETTINGS });
      } else {
        const migrationRow = await this.db.kv.get('migration_school_year_2026_27');
        if (!migrationRow) {
          const saved = settingsRow.value as Partial<SchoolSettings>;
          if (!saved.defaultAnnoScolastico || saved.defaultAnnoScolastico === '2025/2026') {
            await this.db.kv.put({
              key: 'settings',
              value: { ...saved, defaultAnnoScolastico: '2026/27' },
            });
          }
          await this.db.kv.put({ key: 'migration_school_year_2026_27', value: true });
        }
      }

      const mappingRow = await this.db.kv.get('docxMapping');
      if (!mappingRow) {
        await this.db.kv.put({ key: 'docxMapping', value: DEFAULT_MAPPING });
      }

      const catalogRow = await this.db.kv.get('curricoloCatalog');
      if (!catalogRow) {
        await this.db.kv.put({ key: 'curricoloCatalog', value: CURRICOLO_VERTICALE_SEED });
        await this.db.kv.put({ key: 'migration_curricolo_seed_v2', value: true });
        await this.db.kv.put({ key: 'migration_curricolo_seed_v3', value: true });
        await this.db.kv.put({ key: 'migration_curricolo_seed_v4', value: true });
      } else {
        const seedV4Flag = await this.db.kv.get('migration_curricolo_seed_v4');
        if (!seedV4Flag) {
          const existing = Array.isArray(catalogRow.value)
            ? (catalogRow.value as CurricoloCatalogEntry[])
            : [];
          const customEntries = existing.filter(
            (e) =>
              !e.id.startsWith('cv-') &&
              !e.id.startsWith('cvn-') &&
              !e.id.startsWith('cvv-')
          );
          await this.db.kv.put({
            key: 'curricoloCatalog',
            value: [...CURRICOLO_VERTICALE_SEED, ...customEntries],
          });
          await this.db.kv.put({ key: 'migration_curricolo_seed_v2', value: true });
          await this.db.kv.put({ key: 'migration_curricolo_seed_v3', value: true });
          await this.db.kv.put({ key: 'migration_curricolo_seed_v4', value: true });
        }
      }

      this.initialized = true;
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async listProgrammazioni(): Promise<Programmazione[]> {
    await this.init();
    const all = await this.db.programmazioni.toArray();
    return all
      .map(normalizeLoadedPlan)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProgrammazione(id: string): Promise<Programmazione | undefined> {
    await this.init();
    const found = await this.db.programmazioni.get(id);
    return found ? normalizeLoadedPlan(found) : undefined;
  }

  async saveProgrammazione(plan: Programmazione): Promise<void> {
    await this.init();
    const updated: Programmazione = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };
    try {
      await this.db.programmazioni.put(updated);
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async deleteProgrammazione(id: string): Promise<void> {
    await this.init();
    await this.db.programmazioni.delete(id);
  }

  async listLibraryItems(): Promise<LibraryItem[]> {
    await this.init();
    const items = await this.db.library.toArray();
    return items.sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));
  }

  async saveLibraryItem(item: LibraryItem): Promise<void> {
    await this.init();
    const updated: LibraryItem = {
      ...item,
      updatedAt: new Date().toISOString(),
    };
    try {
      await this.db.library.put(updated);
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async deleteLibraryItem(id: string): Promise<void> {
    await this.init();
    await this.db.library.delete(id);
  }

  async bulkImportLibraryItems(items: LibraryItem[]): Promise<void> {
    await this.init();
    try {
      await this.db.library.bulkPut(items);
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async listRules(): Promise<SuggestionRule[]> {
    await this.init();
    const rules = await this.db.rules.toArray();
    return rules.sort((a, b) => a.priorita - b.priorita);
  }

  async saveRule(rule: SuggestionRule): Promise<void> {
    await this.init();
    try {
      await this.db.rules.put(rule);
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async deleteRule(id: string): Promise<void> {
    await this.init();
    await this.db.rules.delete(id);
  }

  async resetDefaultRules(): Promise<SuggestionRule[]> {
    await this.init();
    await this.db.transaction('rw', this.db.rules, async () => {
      await this.db.rules.clear();
      await this.db.rules.bulkPut(DEFAULT_RULES);
    });
    return this.listRules();
  }

  async getSettings(): Promise<SchoolSettings> {
    await this.init();
    const row = await this.db.kv.get('settings');
    if (!row || !row.value) return DEFAULT_SCHOOL_SETTINGS;
    const saved = row.value as Partial<SchoolSettings>;
    return {
      ...DEFAULT_SCHOOL_SETTINGS,
      ...saved,
      soglieFasce: {
        ...DEFAULT_SCHOOL_SETTINGS.soglieFasce,
        ...(saved.soglieFasce ?? {}),
      },
      soglieQuoteCaratteristiche: {
        ...DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
        ...(saved.soglieQuoteCaratteristiche ?? {}),
      },
    };
  }

  async saveSettings(settings: SchoolSettings): Promise<void> {
    await this.init();
    try {
      await this.db.kv.put({ key: 'settings', value: settings });
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async getDocxMapping(): Promise<DocxMappingSchema> {
    await this.init();
    const row = await this.db.kv.get('docxMapping');
    if (!row || !row.value) return DEFAULT_MAPPING;
    return row.value as DocxMappingSchema;
  }

  async saveDocxMapping(mapping: DocxMappingSchema): Promise<void> {
    await this.init();
    try {
      await this.db.kv.put({ key: 'docxMapping', value: mapping });
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async resetDefaultDocxMapping(): Promise<DocxMappingSchema> {
    await this.init();
    await this.db.kv.put({ key: 'docxMapping', value: DEFAULT_MAPPING });
    return DEFAULT_MAPPING;
  }

  async getCurricoloCatalog(): Promise<CurricoloCatalogEntry[]> {
    await this.init();
    const row = await this.db.kv.get('curricoloCatalog');
    if (!row || !Array.isArray(row.value)) return CURRICOLO_VERTICALE_SEED;
    return row.value as CurricoloCatalogEntry[];
  }

  async saveCurricoloCatalog(items: CurricoloCatalogEntry[]): Promise<void> {
    await this.init();
    try {
      await this.db.kv.put({ key: 'curricoloCatalog', value: items });
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }

  async resetDefaultCurricoloCatalog(): Promise<CurricoloCatalogEntry[]> {
    await this.init();
    await this.db.kv.put({ key: 'curricoloCatalog', value: CURRICOLO_VERTICALE_SEED });
    return CURRICOLO_VERTICALE_SEED;
  }

  async exportAllData(): Promise<BackupPlainData> {
    await this.init();
    const [programmazioni, library, rules, settings, docxMapping, curricoloCatalog] =
      await Promise.all([
        this.listProgrammazioni(),
        this.listLibraryItems(),
        this.listRules(),
        this.getSettings(),
        this.getDocxMapping(),
        this.getCurricoloCatalog(),
      ]);
    return {
      app: 'PIANORAMA',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      programmazioni,
      library,
      rules,
      settings,
      docxMapping,
      curricoloCatalog,
    };
  }

  async restoreAllData(
    data: BackupPlainData,
    options: BackupMergeOptions = { mode: 'merge', duplicatePolicy: 'skip' }
  ): Promise<BackupRestoreResult> {
    await this.init();
    try {
      return await this.db.transaction(
        'rw',
        [this.db.programmazioni, this.db.library, this.db.rules, this.db.kv],
        async () => {
          if (options.mode === 'replace') {
            await this.db.programmazioni.clear();
            await this.db.library.clear();
            await this.db.rules.clear();

            const normalizedPlans = (data.programmazioni ?? []).map(normalizeLoadedPlan);
            if (normalizedPlans.length > 0) {
              await this.db.programmazioni.bulkPut(normalizedPlans);
            }
            if (data.library?.length) {
              await this.db.library.bulkPut(data.library);
            }
            if (data.rules?.length) {
              await this.db.rules.bulkPut(data.rules);
            }
            if (data.settings) {
              await this.db.kv.put({
                key: 'settings',
                value: { ...DEFAULT_SCHOOL_SETTINGS, ...data.settings },
              });
            }
            if (data.docxMapping) {
              await this.db.kv.put({
                key: 'docxMapping',
                value: data.docxMapping,
              });
            }
            if (data.curricoloCatalog?.length) {
              await this.db.kv.put({
                key: 'curricoloCatalog',
                value: data.curricoloCatalog,
              });
            }

            return {
              mode: 'replace',
              addedPlans: normalizedPlans.length,
              overwrittenPlans: 0,
              skippedPlans: 0,
              keptLocalPlans: 0,
            };
          }

          const overwriteDuplicates = options.duplicatePolicy === 'overwrite';
          const [localPlans, localLibrary, localRules, localCatalogRow] = await Promise.all([
            this.db.programmazioni.toArray(),
            this.db.library.toArray(),
            this.db.rules.toArray(),
            this.db.kv.get('curricoloCatalog'),
          ]);

          const planMerge = computeMergedProgrammazioni(
            localPlans,
            data.programmazioni ?? [],
            overwriteDuplicates
          );

          if (planMerge.idsToDelete.length > 0) {
            await this.db.programmazioni.bulkDelete(planMerge.idsToDelete);
          }
          if (planMerge.plansToPut.length > 0) {
            await this.db.programmazioni.bulkPut(
              planMerge.plansToPut.map(normalizeLoadedPlan)
            );
          }

          if (data.library?.length) {
            const mergedLib = mergeItemsById(
              localLibrary,
              data.library,
              overwriteDuplicates
            );
            await this.db.library.bulkPut(mergedLib);
          }

          if (data.rules?.length) {
            const mergedRules = mergeItemsById(
              localRules,
              data.rules,
              overwriteDuplicates
            );
            await this.db.rules.bulkPut(mergedRules);
          }

          if (data.curricoloCatalog?.length) {
            const existingCatalog = Array.isArray(localCatalogRow?.value)
              ? (localCatalogRow.value as CurricoloCatalogEntry[])
              : CURRICOLO_VERTICALE_SEED;
            const mergedCatalog = mergeItemsById(
              existingCatalog,
              data.curricoloCatalog,
              overwriteDuplicates
            );
            await this.db.kv.put({
              key: 'curricoloCatalog',
              value: mergedCatalog,
            });
          }

          return {
            mode: 'merge',
            addedPlans: planMerge.addedPlans,
            overwrittenPlans: planMerge.overwrittenPlans,
            skippedPlans: planMerge.skippedPlans,
            keptLocalPlans: planMerge.keptLocalPlans,
          };
        }
      );
    } catch (err) {
      throw normalizeStorageError(err);
    }
  }
}

export const repository: PianoramaRepository = new DexiePianoramaRepository();
