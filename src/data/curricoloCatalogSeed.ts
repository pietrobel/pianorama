import curricoloSecondariaRaw from './curricolo_secondaria.json';
import type { CurricoloCatalogEntry } from '../domain/types';

export const CURRICOLO_VERTICALE_SEED: CurricoloCatalogEntry[] =
  curricoloSecondariaRaw as CurricoloCatalogEntry[];
