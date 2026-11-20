import {
  FONTI_RILEVAZIONE_OPTIONS,
  formatDocenteConTitolo,
  formatFirmaDocente,
  getCurricoloIntroNoteText,
  LIVELLI_CLASSE_OPTIONS,
  METODI_OPTIONS,
  MEZZI_INDIVIDUAZIONE_OPTIONS,
  MEZZI_STRUMENTI_OPTIONS,
  STRATEGIE_CONSOLIDAMENTO_OPTIONS,
  STRATEGIE_POTENZIAMENTO_OPTIONS,
  STRATEGIE_RECUPERO_OPTIONS,
  TIPOLOGIE_CLASSE_OPTIONS,
  VERIFICHE_ORALI_OPTIONS,
  VERIFICHE_SCRITTE_OPTIONS,
} from '../domain/defaults';
import type {
  DocxMappingSchema,
  Programmazione,
  SchoolSettings,
} from '../domain/types';
import {
  buildUnifiedClassDescriptionText,
  getStudentNamesByLevelBand,
} from '../engine/classCharacteristicsEngine';
import { buildClassCompositionIntro } from '../engine/questionnaireEngine';
import { getSchoolBannerDataUrl } from '../export/schoolBannerAsset';

interface DocumentSheetPreviewProps {
  plan: Programmazione;
  settings: SchoolSettings;
  mapping: DocxMappingSchema;
  showInstitutionBanner?: boolean;
}

export function DocumentSheetPreview({
  plan,
  settings,
  mapping,
  showInstitutionBanner = false,
}: DocumentSheetPreviewProps) {
  const layoutStyle =
    plan.datiGenerali.layoutDocumento ?? settings.defaultLayoutDocumento ?? 'originale';
  const docenteGenere =
    plan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';
  const hasDocenteName = Boolean(plan.datiGenerali.docente.trim());
  const docenteConTitolo = hasDocenteName
    ? formatDocenteConTitolo(plan.datiGenerali.docente, docenteGenere)
    : '___________________________';
  const firmaRaw = (plan.verificheValutazione.firmaDocente || plan.datiGenerali.docente).trim();
  const firmaDocente = firmaRaw
    ? formatFirmaDocente(firmaRaw, docenteGenere)
    : layoutStyle === 'originale'
    ? 'Il/La Docente'
    : formatFirmaDocente('', docenteGenere);

  const isOriginal = layoutStyle === 'originale';
  const checkedGlyph = mapping.typography.checkedGlyph || '☒';
  const uncheckedGlyph = mapping.typography.uncheckedGlyph || '☐';
  const accentColor = isOriginal
    ? '#000000'
    : `#${mapping.typography.headingColorHex.replace('#', '') || '1F3864'}`;

  const compositionIntro = buildClassCompositionIntro(plan);
  const unifiedClassDescription = buildUnifiedClassDescriptionText(
    plan,
    settings,
    compositionIntro
  );
  const bandStudents = getStudentNamesByLevelBand(plan);
  const disabilitaCount = plan.composizione.disabilita ?? 0;
  const leftCurricoloHeader =
    (plan.curricolo.indicazioniVersione ?? 'vecchie') === 'nuove' ? 'OBIETTIVI' : 'ABILITÀ';
  const notaIntroCurricolo = getCurricoloIntroNoteText(
    plan.curricolo.notaIntroduttiva,
    plan.curricolo.indicazioniVersione
  );
  const resolvedCompetenze = plan.curricolo.competenzeAttese.length
    ? plan.curricolo.competenzeAttese
    : (plan.curricolo.vociCatalogoImportate ?? [])
        .filter((v) => v.tipo === 'competenza' && v.testo.trim())
        .map((v) => v.testo.trim());

  const renderCheck = (checked: boolean, label: string, bracketStyle = false) => {
    const marker = bracketStyle
      ? checked
        ? '[X]'
        : '[  ]'
      : checked
      ? checkedGlyph
      : uncheckedGlyph;
    return (
      <span
        key={label}
        className={`inline-flex items-baseline gap-1.5 ${
          checked && !isOriginal ? 'font-semibold text-black' : 'text-black'
        }`}
      >
        <span
          className={bracketStyle ? 'font-mono text-[12px]' : ''}
          style={{ color: checked ? accentColor : '#334155' }}
        >
          {marker}
        </span>
        <span className={checked && isOriginal ? 'font-semibold' : ''}>{label}</span>
      </span>
    );
  };

  const renderBlankRules = (count: number) => (
    <div className="my-2 space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-3 border-b border-black" />
      ))}
    </div>
  );

  const cellBorderClass = isOriginal ? 'border border-black' : 'border border-slate-400';

  return (
    <article
      aria-label="Anteprima documento programmazione"
      className={`print-only-sheet mx-auto w-full max-w-[210mm] rounded-sm border border-slate-300 bg-white p-6 text-black shadow-sm sm:p-10 ${
        isOriginal
          ? 'font-[Arial,Helvetica,sans-serif] text-[13px] leading-[1.35]'
          : 'font-doc text-[14px] leading-[1.45]'
      }`}
    >
      {/* Intestazione istituzionale (nella UI di default mostra segnaposto neutro per uso personale) */}
      <header
        className={`pb-3 text-center ${
          isOriginal ? 'border-b-4 border-double border-black' : 'border-b-2 pb-4'
        }`}
        style={isOriginal ? undefined : { borderColor: accentColor }}
      >
        {showInstitutionBanner ? (
          isOriginal ? (
            <img
              src={getSchoolBannerDataUrl()}
              alt="Intestazione istituzionale"
              className="mx-auto mb-2 max-h-32 w-full max-w-[600px] object-contain"
            />
          ) : (
            <>
              <p
                className="text-xs font-bold tracking-wider uppercase"
                style={{ color: accentColor }}
              >
                {settings.ministryHeader || mapping.institutionHeader.ministry}
              </p>
              <h2 className="mt-1 text-lg font-bold sm:text-xl" style={{ color: accentColor }}>
                {settings.schoolName || mapping.institutionHeader.schoolName}
              </h2>
              <p className="mt-0.5 text-xs text-slate-700">
                {settings.schoolAddressLine || mapping.institutionHeader.addressLine}
              </p>
              <p className="text-xs text-slate-700">
                {settings.schoolContactsLine || mapping.institutionHeader.contactsLine}
              </p>
            </>
          )
        ) : (
          <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Intestazione istituzionale riservata all’esportazione (banner ufficiale incluso nei file DOCX e PDF)
          </div>
        )}
      </header>

      {/* Titolo & Dati Generali */}
      {isOriginal ? (
        <div className="mt-8 space-y-2.5">
          <p className="text-center text-[15px]">
            PROGRAMMAZIONE DISCIPLINARE di{' '}
            <span className="font-bold underline">
              {plan.datiGenerali.titoloDisciplina ||
                plan.datiGenerali.disciplina ||
                '___________________'}
            </span>
          </p>
          <p className="text-center text-[15px]">
            SCUOLA{' '}
            <span className="underline">
              {plan.datiGenerali.scuola || '_____________________________________________'}
            </span>
          </p>
          <p className="text-center text-[15px]">
            PLESSO DI{' '}
            <span className="underline">
              {plan.datiGenerali.plesso || '_____________________________________________'}
            </span>
          </p>

          <div className="mt-4 grid max-w-lg grid-cols-[175px_1fr] gap-y-1 text-[13px]">
            <span>ANNO SCOLASTICO</span>
            <span className="font-semibold tabular-nums">
              {plan.datiGenerali.annoScolastico || '________'}
            </span>
            <span>CLASSE</span>
            <span className="font-semibold">
              {plan.datiGenerali.classe
                ? `${plan.datiGenerali.classe} ${plan.datiGenerali.sezione}`.trim()
                : '________'}
            </span>
            <span>DISCIPLINA</span>
            <span className="font-semibold">
              {plan.datiGenerali.disciplina || '___________________________'}
            </span>
            <span>DOCENTE</span>
            <span className={hasDocenteName ? 'font-semibold' : ''}>{docenteConTitolo}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="my-5 text-center">
            <h1
              className="text-xl font-bold tracking-tight uppercase sm:text-2xl"
              style={{ color: accentColor }}
            >
              PROGRAMMAZIONE DISCIPLINARE di{' '}
              {plan.datiGenerali.titoloDisciplina || plan.datiGenerali.disciplina || '___________'}
            </h1>
          </div>
          <table className="w-full border-collapse border border-slate-400 text-sm">
            <tbody>
              <tr>
                <td className="w-1/2 border border-slate-400 px-3 py-1.5">
                  <strong style={{ color: accentColor }}>SCUOLA:</strong> {plan.datiGenerali.scuola}
                </td>
                <td className="w-1/2 border border-slate-400 px-3 py-1.5">
                  <strong style={{ color: accentColor }}>PLESSO DI:</strong>{' '}
                  {plan.datiGenerali.plesso || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-3 py-1.5">
                  <div>
                    <strong style={{ color: accentColor }}>ANNO SCOLASTICO:</strong>{' '}
                    <span className="tabular-nums">{plan.datiGenerali.annoScolastico}</span>
                  </div>
                  <div>
                    <strong style={{ color: accentColor }}>CLASSE:</strong>{' '}
                    {plan.datiGenerali.classe} {plan.datiGenerali.sezione}
                  </div>
                </td>
                <td className="border border-slate-400 px-3 py-1.5">
                  <div>
                    <strong style={{ color: accentColor }}>DISCIPLINA:</strong>{' '}
                    {plan.datiGenerali.disciplina}
                  </div>
                  <div>
                    <strong style={{ color: accentColor }}>DOCENTE:</strong> {docenteConTitolo}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Composizione della classe */}
      <section className="mt-5">
        {isOriginal ? (
          <>
            <p className="mb-1.5">
              <span className="bg-[#E6E6E6] px-1 font-bold uppercase">
                COMPOSIZIONE DELLA CLASSE
              </span>
            </p>
            <table className="w-full border-collapse border border-black text-left text-[12px] tabular-nums">
              <tbody>
                <tr>
                  <td className="w-[14%] border border-black px-2 py-1.5">
                    Alunni: <strong>{plan.composizione.alunni}</strong>
                  </td>
                  <td className="w-[14%] border border-black px-2 py-1.5">
                    Maschi: <strong>{plan.composizione.maschi}</strong>
                  </td>
                  <td className="w-[14%] border border-black px-2 py-1.5">
                    Femmine: <strong>{plan.composizione.femmine}</strong>
                  </td>
                  <td className="w-[15%] border border-black px-2 py-1.5">
                    Ripetenti: <strong>{plan.composizione.ripetenti}</strong>
                  </td>
                  <td className="w-[27%] border border-black px-2 py-1.5">
                    Con Bisogni Educativi Speciali (BES):{' '}
                    <strong>{plan.composizione.bes}</strong>
                  </td>
                  <td className="w-[16%] border border-black px-2 py-1.5">
                    Con disabilità: <strong>{disabilitaCount}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            <h3
              className="border-b pb-0.5 text-sm font-bold uppercase"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              COMPOSIZIONE DELLA CLASSE
            </h3>
            <table className={`mt-2 w-full border-collapse text-center text-sm ${cellBorderClass}`}>
              <thead>
                <tr className="text-white" style={{ backgroundColor: accentColor }}>
                  <th className={`${cellBorderClass} px-2 py-1`}>Alunni</th>
                  <th className={`${cellBorderClass} px-2 py-1`}>Maschi</th>
                  <th className={`${cellBorderClass} px-2 py-1`}>Femmine</th>
                  <th className={`${cellBorderClass} px-2 py-1`}>Ripetenti</th>
                  <th className={`${cellBorderClass} px-2 py-1`}>
                    Con Bisogni Educativi Speciali (BES)
                  </th>
                  <th className={`${cellBorderClass} px-2 py-1`}>Con disabilità</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr>
                  <td className={`${cellBorderClass} px-2 py-1.5 font-bold`}>
                    {plan.composizione.alunni}
                  </td>
                  <td className={`${cellBorderClass} px-2 py-1.5`}>{plan.composizione.maschi}</td>
                  <td className={`${cellBorderClass} px-2 py-1.5`}>{plan.composizione.femmine}</td>
                  <td className={`${cellBorderClass} px-2 py-1.5`}>
                    {plan.composizione.ripetenti}
                  </td>
                  <td className={`${cellBorderClass} px-2 py-1.5 font-bold`}>
                    {plan.composizione.bes}
                  </td>
                  <td className={`${cellBorderClass} px-2 py-1.5 font-bold`}>
                    {disabilitaCount}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Situazione e Presentazione della classe */}
      <section className="mt-5">
        {isOriginal ? (
          <>
            <p className="mb-1.5">
              <span className="bg-[#E6E6E6] px-1 font-bold uppercase">
                SITUAZIONE DELLA CLASSE
              </span>
            </p>
            <table className="w-full border-collapse border border-black text-[13px]">
              <tbody>
                <tr className="bg-[#F3F3F3]">
                  <td colSpan={2} className="w-[58%] border border-black px-3 py-1 text-center uppercase">
                    TIPOLOGIA
                  </td>
                  <td className="w-[42%] border border-black px-3 py-1 text-center uppercase">
                    LIVELLO
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-black px-3 py-2 align-top">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {(
                        [
                          ['tranquilla', 'motivata'],
                          ['vivace', 'poco motivata'],
                          ['collaborativa', 'problematica'],
                          ['poco collaborativa', null],
                        ] as const
                      ).flatMap(([leftOpt, rightOpt]) => {
                        const lChk = plan.situazione.tipologie.includes(leftOpt);
                        const cells = [
                          <div key={leftOpt} className="flex items-center justify-between gap-2">
                            <span className={lChk ? 'font-semibold' : ''}>{leftOpt}</span>
                            <span className="font-mono text-[12px]">
                              {lChk ? '[X]' : '[  ]'}
                            </span>
                          </div>,
                        ];
                        if (rightOpt) {
                          const rChk = plan.situazione.tipologie.includes(rightOpt);
                          cells.push(
                            <div key={rightOpt} className="flex items-center justify-between gap-2">
                              <span className={rChk ? 'font-semibold' : ''}>{rightOpt}</span>
                              <span className="font-mono text-[12px]">
                                {rChk ? '[X]' : '[  ]'}
                              </span>
                            </div>
                          );
                        } else {
                          cells.push(<div key="empty-cell" />);
                        }
                        return cells;
                      })}
                    </div>
                  </td>
                  <td className="border border-black px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {LIVELLI_CLASSE_OPTIONS.map((opt) =>
                        renderCheck(plan.situazione.livello === opt.value, opt.label, false)
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="w-[30%] border border-black bg-[#E6E6E6] px-2.5 py-2 text-center align-middle text-[12px] uppercase">
                    MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI:
                  </td>
                  <td colSpan={2} className="border border-black px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {MEZZI_INDIVIDUAZIONE_OPTIONS.map((opt) =>
                        renderCheck(plan.situazione.mezziIndividuazione.includes(opt), opt, false)
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            <h3
              className="border-b pb-0.5 text-sm font-bold uppercase"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              SITUAZIONE DELLA CLASSE
            </h3>
            <table className="mt-2 w-full border-collapse border border-slate-400 text-sm">
              <tbody>
                <tr>
                  <td
                    className="w-1/4 border border-slate-400 px-3 py-2 font-bold align-top"
                    style={{ color: accentColor }}
                  >
                    TIPOLOGIA
                  </td>
                  <td className="border border-slate-400 px-3 py-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {TIPOLOGIE_CLASSE_OPTIONS.map((opt) =>
                        renderCheck(plan.situazione.tipologie.includes(opt), opt)
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    className="border border-slate-400 px-3 py-2 font-bold align-top"
                    style={{ color: accentColor }}
                  >
                    LIVELLO
                  </td>
                  <td className="border border-slate-400 px-3 py-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {LIVELLI_CLASSE_OPTIONS.map((opt) =>
                        renderCheck(plan.situazione.livello === opt.value, opt.label)
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    className="border border-slate-400 px-3 py-2 font-bold align-top"
                    style={{ color: accentColor }}
                  >
                    MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI
                  </td>
                  <td className="border border-slate-400 px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {MEZZI_INDIVIDUAZIONE_OPTIONS.map((opt) =>
                        renderCheck(plan.situazione.mezziIndividuazione.includes(opt), opt)
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Analisi della situazione di partenza */}
      <section className="mt-5">
        {isOriginal ? (
          <>
            <h3 className="text-[13px] font-bold uppercase">
              ANALISI DELLA SITUAZIONE DI PARTENZA
            </h3>
            <p className="mt-1 border-b border-black pb-0.5 text-[13px] uppercase">
              <span className="bg-[#E6E6E6] px-0.5">
                SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA
              </span>
              :
            </p>
            {unifiedClassDescription ? (
              <p className="mt-2 whitespace-pre-wrap text-justify text-[13px]">
                1. {unifiedClassDescription}
              </p>
            ) : (
              renderBlankRules(5)
            )}
            <p className="mt-3 font-bold">2. Livelli di partenza rilevati</p>
            <table className="mt-2 w-[92%] border-collapse border border-black text-left text-[12px] tabular-nums">
              <tbody>
                <tr>
                  <td className="w-1/4 border border-black p-2 align-top">
                    <p className="font-bold">Livello basso</p>
                    <p className="text-[11px]">(voti inferiori alla sufficienza)</p>
                    <p className="mt-3 font-bold">
                      Alunni: {plan.analisiPartenza.livelli.bassoAlunni}
                    </p>
                  </td>
                  <td className="w-1/4 border border-black p-2 align-top">
                    <p className="font-bold">Livello medio/basso</p>
                    <p className="text-[11px]">(voto 6)</p>
                    <p className="mt-3 font-bold">
                      Alunni: {plan.analisiPartenza.livelli.medioBassoAlunni}
                    </p>
                  </td>
                  <td className="w-1/4 border border-black p-2 align-top">
                    <p className="font-bold">Livello medio</p>
                    <p className="text-[11px]">(voti 7/8)</p>
                    <p className="mt-3 font-bold">
                      Alunni: {plan.analisiPartenza.livelli.medioAlunni}
                    </p>
                  </td>
                  <td className="w-1/4 border border-black p-2 align-top">
                    <p className="font-bold">Livello alto</p>
                    <p className="text-[11px]">(voti 9/ 10)</p>
                    <p className="mt-3 font-bold">
                      Alunni: {plan.analisiPartenza.livelli.altoAlunni}
                    </p>
                  </td>
                </tr>
                <tr>
                  {(['basso', 'medio_basso', 'medio', 'alto'] as const).map((bandKey) => (
                    <td
                      key={bandKey}
                      className="min-h-10 h-10 w-1/4 border border-black p-2 align-top text-[11px]"
                    >
                      {bandStudents.hasAnyImportedStudents && bandStudents.bands[bandKey].length > 0 ? (
                        <ul className="space-y-0.5">
                          {bandStudents.bands[bandKey].map((name, i) => (
                            <li key={i}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>&nbsp;</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            <h3
              className="border-b pb-0.5 text-sm font-bold uppercase"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              ANALISI DELLA SITUAZIONE DI PARTENZA
            </h3>
            <p className="mt-2 text-sm font-bold" style={{ color: accentColor }}>
              SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA:
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
              {unifiedClassDescription ||
                `${compositionIntro}\nDescrizione sintetica della situazione di partenza non ancora compilata.`}
            </p>
            <table className={`mt-3 w-full border-collapse text-center text-xs sm:text-sm ${cellBorderClass}`}>
              <thead>
                <tr className="text-white" style={{ backgroundColor: accentColor }}>
                  <th className={`${cellBorderClass} px-2 py-1`}>Livello basso (voti &lt; 6)</th>
                  <th className={`${cellBorderClass} px-2 py-1`}>Livello medio/basso (voto 6)</th>
                  <th className={`${cellBorderClass} px-2 py-1`}>Livello medio (voti 7/8)</th>
                  <th className={`${cellBorderClass} px-2 py-1`}>Livello alto (voti 9/10)</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr>
                  <td className={`${cellBorderClass} px-2 py-1.5`}>
                    Alunni: {plan.analisiPartenza.livelli.bassoAlunni}
                  </td>
                  <td className={`${cellBorderClass} px-2 py-1.5`}>
                    Alunni: {plan.analisiPartenza.livelli.medioBassoAlunni}
                  </td>
                  <td className={`${cellBorderClass} px-2 py-1.5`}>
                    Alunni: {plan.analisiPartenza.livelli.medioAlunni}
                  </td>
                  <td className={`${cellBorderClass} px-2 py-1.5`}>
                    Alunni: {plan.analisiPartenza.livelli.altoAlunni}
                  </td>
                </tr>
                <tr>
                  {(['basso', 'medio_basso', 'medio', 'alto'] as const).map((bandKey) => (
                    <td
                      key={bandKey}
                      className={`${cellBorderClass} h-9 px-2 py-1.5 text-left align-top text-xs`}
                    >
                      {bandStudents.hasAnyImportedStudents && bandStudents.bands[bandKey].length > 0 ? (
                        <ul className="space-y-0.5">
                          {bandStudents.bands[bandKey].map((name, i) => (
                            <li key={i}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>&nbsp;</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </>
        )}

        <div className="mt-4">
          <p className="text-[13px] font-bold uppercase" style={{ color: accentColor }}>
            FONTI DI RILEVAZIONE DEI DATI
          </p>
          <div className="mt-1 flex flex-col gap-1 text-[13px]">
            {FONTI_RILEVAZIONE_OPTIONS.map((opt) =>
              renderCheck(plan.analisiPartenza.fontiRilevazione.includes(opt), opt)
            )}
            {renderCheck(
              Boolean(plan.analisiPartenza.altraFonte.trim()),
              `altro: ${
                plan.analisiPartenza.altraFonte.trim() ||
                '____________________________________________'
              }`
            )}
          </div>
        </div>
      </section>

      {/* Strategie e interventi */}
      <section className="mt-5">
        <div
          className={
            isOriginal
              ? 'border border-black px-3 py-1 text-center text-[13px] uppercase'
              : 'border-b pb-0.5 text-sm font-bold uppercase'
          }
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          STRATEGIE ED INTERVENTI PER IL POTENZIAMENTO, IL CONSOLIDAMENTO ED IL RECUPERO
        </div>
        <table
          className={`w-full border-collapse text-[13px] ${
            isOriginal ? 'border-x border-b border-black' : 'mt-2 border border-slate-400'
          }`}
        >
          <thead>
            <tr
              className={isOriginal ? 'bg-[#F3F3F3] text-black' : 'text-white'}
              style={isOriginal ? undefined : { backgroundColor: accentColor }}
            >
              <th className={`w-1/4 ${cellBorderClass} px-3 py-1 text-center`}>
                {isOriginal ? 'Gruppi di livello' : 'Gruppo di livello'}
              </th>
              <th className={`${cellBorderClass} px-3 py-1 text-center`}>
                {isOriginal
                  ? 'STRATEGIE DA UTILIZZARE (segnare con la x)'
                  : 'Strategie ed interventi programmati'}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                className={`${cellBorderClass} px-3 py-2 align-middle ${
                  isOriginal ? '' : 'font-bold'
                }`}
                style={{ color: accentColor }}
              >
                POTENZIAMENTO
              </td>
              <td className={`${cellBorderClass} px-3 py-2`}>
                <div className="flex flex-col gap-1">
                  {STRATEGIE_POTENZIAMENTO_OPTIONS.map((opt) =>
                    renderCheck(plan.interventi.potenziamento.includes(opt), opt)
                  )}
                  {renderCheck(
                    Boolean(plan.interventi.potenziamentoAltro.trim()),
                    `Altro: ${
                      plan.interventi.potenziamentoAltro.trim() ||
                      '________________________________________________'
                    }`
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td
                className={`${cellBorderClass} px-3 py-2 align-middle ${
                  isOriginal ? '' : 'font-bold'
                }`}
                style={{ color: accentColor }}
              >
                CONSOLIDAMENTO
              </td>
              <td className={`${cellBorderClass} px-3 py-2`}>
                <div className="flex flex-col gap-1">
                  {STRATEGIE_CONSOLIDAMENTO_OPTIONS.map((opt) =>
                    renderCheck(plan.interventi.consolidamento.includes(opt), opt)
                  )}
                  {renderCheck(
                    Boolean(plan.interventi.consolidamentoAltro.trim()),
                    `Altro: ${
                      plan.interventi.consolidamentoAltro.trim() ||
                      '________________________________________________'
                    }`
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td
                className={`${cellBorderClass} px-3 py-2 align-middle ${
                  isOriginal ? '' : 'font-bold'
                }`}
                style={{ color: accentColor }}
              >
                RECUPERO
              </td>
              <td className={`${cellBorderClass} px-3 py-2`}>
                <div className="flex flex-col gap-1">
                  {STRATEGIE_RECUPERO_OPTIONS.map((opt) =>
                    renderCheck(plan.interventi.recupero.includes(opt), opt)
                  )}
                  {renderCheck(
                    Boolean(plan.interventi.recuperoAltro.trim()),
                    `Altro: ${
                      plan.interventi.recuperoAltro.trim() ||
                      '________________________________________________'
                    }`
                  )}
                </div>
              </td>
            </tr>
            {!isOriginal && (
              <tr>
                <td
                  className={`${cellBorderClass} px-3 py-2 font-bold align-top`}
                  style={{ color: accentColor }}
                >
                  Alunni con BES e interventi programmati
                </td>
                <td className={`${cellBorderClass} px-3 py-2 whitespace-pre-wrap`}>
                  {plan.interventi.besInterventiProgrammati.trim() ||
                    'Riferimento esclusivo ai piani personalizzati (PDP/PEI) in forma anonima.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {isOriginal && (
          <div className="mt-4">
            <p className="font-bold">Alunni con BES e interventi programmati</p>
            {plan.interventi.besInterventiProgrammati.trim() ? (
              <p className="mt-1 whitespace-pre-wrap text-justify">
                {plan.interventi.besInterventiProgrammati.trim()}
              </p>
            ) : (
              renderBlankRules(4)
            )}
          </div>
        )}
      </section>

      {/* Curricolo */}
      <section className="mt-5">
        {isOriginal ? (
          <table className="w-full border-collapse border border-black text-xs sm:text-[13px]">
            <tbody>
              <tr>
                <td colSpan={2} className="border border-black p-3 align-top">
                  <p className="font-bold uppercase">
                    <span className="bg-[#E6E6E6] px-1">
                      TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE
                    </span>{' '}
                    IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO
                  </p>

                  {resolvedCompetenze.length > 0 && (
                    <div className="mt-2">
                      <p className="font-bold">Competenze:</p>
                      <ul className="mt-0.5 list-disc pl-5">
                        {resolvedCompetenze.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.curricolo.competenzeDigitali.length > 0 && (
                    <div className="mt-2">
                      <p className="font-bold">Competenze digitali:</p>
                      <ul className="mt-0.5 list-disc pl-5">
                        {plan.curricolo.competenzeDigitali.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black p-2.5 text-justify italic">
                  {notaIntroCurricolo}
                </td>
              </tr>
              <tr className="bg-[#E6E6E6] text-center font-bold uppercase">
                <td className="w-1/2 border border-black px-2.5 py-1.5">{leftCurricoloHeader}</td>
                <td className="w-1/2 border border-black px-2.5 py-1.5">CONOSCENZE</td>
              </tr>
              {plan.curricolo.righeAbilitaConoscenze.length > 0 ? (
                plan.curricolo.righeAbilitaConoscenze.map((row) => {
                  const renderCell = (text: string, hint?: string) => {
                    const clean = (text ?? '')
                      .replace(/([^\n])\s*([☐☑☒□■▢•])\s*/g, '$1\n$2 ')
                      .replace(/^\s*[☐☑☒□■▢]\s*/gm, '• ')
                      .trim();
                    if (!clean) return '—';
                    const normHint = (hint ?? '').trim();
                    const effective =
                      normHint && !clean.toLowerCase().startsWith(normHint.toLowerCase())
                        ? `${normHint}\n${clean}`
                        : clean;
                    const lines = effective.split('\n');
                    return lines.map((line, idx) => {
                      const t = line.trim();
                      const isNucleo =
                        idx === 0 &&
                        !t.startsWith('•') &&
                        !t.startsWith('-') &&
                        ((normHint.length > 0 && t.toLowerCase() === normHint.toLowerCase()) ||
                          (lines.length > 1 && t.length <= 65 && !/[.!?]$/.test(t)));
                      return (
                        <div key={idx} className={isNucleo ? 'font-bold' : undefined}>
                          {line}
                        </div>
                      );
                    });
                  };
                  return (
                    <tr key={row.id}>
                      <td className="border border-black px-2.5 py-2 align-top">
                        {renderCell(row.abilita, row.traguardo)}
                      </td>
                      <td className="border border-black px-2.5 py-2 align-top">
                        {renderCell(row.conoscenze, row.traguardo)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="h-24 border border-black px-2.5 py-2" />
                  <td className="h-24 border border-black px-2.5 py-2" />
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <>
            <h3
              className="border-b pb-0.5 text-sm font-bold uppercase"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO
            </h3>

            {resolvedCompetenze.length > 0 && (
              <div className="mt-2">
                <p className="font-bold" style={{ color: accentColor }}>
                  Competenze:
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {resolvedCompetenze.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan.curricolo.competenzeDigitali.length > 0 && (
              <div className="mt-2">
                <p className="font-bold" style={{ color: accentColor }}>
                  Competenze digitali:
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {plan.curricolo.competenzeDigitali.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-2 italic text-slate-800">{notaIntroCurricolo}</p>

            <table className={`mt-3 w-full border-collapse text-xs sm:text-sm ${cellBorderClass}`}>
              <thead>
                <tr className="text-white" style={{ backgroundColor: accentColor }}>
                  <th className={`w-1/2 ${cellBorderClass} px-2.5 py-1.5 text-left`}>
                    {leftCurricoloHeader}
                  </th>
                  <th className={`w-1/2 ${cellBorderClass} px-2.5 py-1.5 text-left`}>
                    CONOSCENZE
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.curricolo.righeAbilitaConoscenze.length > 0 ? (
                  plan.curricolo.righeAbilitaConoscenze.map((row) => {
                    const renderCell = (text: string, hint?: string) => {
                      const clean = (text ?? '')
                        .replace(/([^\n])\s*([☐☑☒□■▢•])\s*/g, '$1\n$2 ')
                        .replace(/^\s*[☐☑☒□■▢]\s*/gm, '• ')
                        .trim();
                      if (!clean) return '—';
                      const normHint = (hint ?? '').trim();
                      const effective =
                        normHint && !clean.toLowerCase().startsWith(normHint.toLowerCase())
                          ? `${normHint}\n${clean}`
                          : clean;
                      const lines = effective.split('\n');
                      return lines.map((line, idx) => {
                        const t = line.trim();
                        const isNucleo =
                          idx === 0 &&
                          !t.startsWith('•') &&
                          !t.startsWith('-') &&
                          ((normHint.length > 0 && t.toLowerCase() === normHint.toLowerCase()) ||
                            (lines.length > 1 && t.length <= 65 && !/[.!?]$/.test(t)));
                        return (
                          <div key={idx} className={isNucleo ? 'font-bold' : undefined}>
                            {line}
                          </div>
                        );
                      });
                    };
                    return (
                      <tr key={row.id}>
                        <td className={`${cellBorderClass} px-2.5 py-2 align-top`}>
                          {renderCell(row.abilita, row.traguardo)}
                        </td>
                        <td className={`${cellBorderClass} px-2.5 py-2 align-top`}>
                          {renderCell(row.conoscenze, row.traguardo)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className={`${cellBorderClass} px-3 py-3 italic text-slate-500`}>
                      Nessuna riga inserita nel programma disciplinare.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {plan.curricolo.attivitaProgrammate.trim() && (
          <div className="mt-3">
            <p className="font-bold" style={{ color: accentColor }}>
              Attività programmate:
            </p>
            <p className="whitespace-pre-wrap text-justify">
              {plan.curricolo.attivitaProgrammate}
            </p>
          </div>
        )}
      </section>

      {/* Criteri metodologici */}
      <section className="mt-6">
        {isOriginal ? (
          <h3 className="text-center text-[13px] font-bold uppercase">
            <span className="bg-[#E6E6E6] px-1 underline">
              CRITERI METODOLOGICI, STRATEGIE, STRUMENTI:
            </span>
          </h3>
        ) : (
          <h3
            className="border-b pb-0.5 text-sm font-bold uppercase"
            style={{ color: accentColor, borderColor: accentColor }}
          >
            CRITERI METODOLOGICI, STRATEGIE, STRUMENTI:
          </h3>
        )}
        <p className={`mt-2 whitespace-pre-wrap ${isOriginal ? 'text-justify' : ''}`}>
          {plan.metodiStrumenti.premessaMetodologica}
        </p>

        <table className={`mt-3 w-full border-collapse text-[13px] ${cellBorderClass}`}>
          <thead>
            <tr
              className={isOriginal ? 'bg-[#E6E6E6] text-black' : 'text-white'}
              style={isOriginal ? undefined : { backgroundColor: accentColor }}
            >
              <th
                className={`w-[52%] ${cellBorderClass} px-3 py-1 ${
                  isOriginal ? 'text-center font-normal uppercase' : 'text-left'
                }`}
              >
                METODI
              </th>
              <th
                className={`w-[48%] ${cellBorderClass} px-3 py-1 ${
                  isOriginal ? 'text-center font-normal uppercase' : 'text-left'
                }`}
              >
                MEZZI E STRUMENTI
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${cellBorderClass} px-3 py-2 align-top`}>
                <div className="flex flex-col gap-1">
                  {METODI_OPTIONS.map((opt) =>
                    renderCheck(plan.metodiStrumenti.metodi.includes(opt), opt)
                  )}
                  <p className="mt-3 text-[12px]">
                    ALTRE METODOLOGIE (Brainstorming; Problem solving; Ricerca-azione; Discussione;
                    Role play):{' '}
                    <span className={plan.metodiStrumenti.altreMetodologie.trim() ? 'italic' : ''}>
                      {plan.metodiStrumenti.altreMetodologie.trim() ||
                        '___________________________________________________'}
                    </span>
                  </p>
                </div>
              </td>
              <td className={`${cellBorderClass} px-3 py-2 align-top`}>
                <div className="flex flex-col gap-1">
                  {MEZZI_STRUMENTI_OPTIONS.map((opt) =>
                    renderCheck(plan.metodiStrumenti.mezziEStrumenti.includes(opt), opt)
                  )}
                  <p className="mt-3 text-[12px]">
                    ALTRI SUSSIDI:{' '}
                    <span className={plan.metodiStrumenti.altriSussidi.trim() ? 'italic' : ''}>
                      {plan.metodiStrumenti.altriSussidi.trim() || '__________________________'}
                    </span>
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4">
          <p className="font-bold uppercase" style={{ color: accentColor }}>
            AUSILI DIDATTICI
          </p>
          {isOriginal && (
            <p className="text-[12px]">
              (Libri di testo, eventuali sussidi o testi di approfondimento, strumenti vari…)
            </p>
          )}
          {plan.metodiStrumenti.ausiliDidattici.trim() ? (
            <p className="mt-1 whitespace-pre-wrap text-justify">
              {plan.metodiStrumenti.ausiliDidattici}
            </p>
          ) : isOriginal ? (
            renderBlankRules(3)
          ) : null}
        </div>

        <div className="mt-3">
          <p className="font-bold uppercase" style={{ color: accentColor }}>
            DIDATTICA DIGITALE INTEGRATA
          </p>
          <p className={`mt-1 whitespace-pre-wrap ${isOriginal ? 'text-justify' : ''}`}>
            {plan.metodiStrumenti.didatticaDigitaleIntegrata}
          </p>
        </div>
      </section>

      {/* Separatore visivo pagina 4 nel modello originale */}
      {isOriginal && (
        <div className="no-print my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          <div className="h-px flex-1 bg-slate-300" />
          <span>Pagina 4 — Verifiche, Valutazione e Firma</span>
          <div className="h-px flex-1 bg-slate-300" />
        </div>
      )}

      {/* Verifiche */}
      <section className="mt-5">
        {isOriginal ? (
          <table className="w-full border-collapse border border-black text-[13px]">
            <thead>
              <tr>
                <th
                  colSpan={2}
                  className="border border-black px-3 py-1 text-center font-normal uppercase"
                >
                  VERIFICHE IN ITINERE: MODALITÀ
                </th>
              </tr>
              <tr>
                <th className="w-1/2 border border-black px-3 py-1 text-center font-normal">
                  SCRITTA
                </th>
                <th className="w-1/2 border border-black px-3 py-1 text-center font-normal">
                  ORALE
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    {VERIFICHE_SCRITTE_OPTIONS.map((opt) =>
                      renderCheck(plan.verificheValutazione.verificheScritte.includes(opt), opt)
                    )}
                  </div>
                </td>
                <td className="border border-black px-3 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    {VERIFICHE_ORALI_OPTIONS.map((opt) =>
                      renderCheck(plan.verificheValutazione.verificheOrali.includes(opt), opt)
                    )}
                    <div className="mt-3">
                      <p>ALTRI TIPI DI PROVE:</p>
                      <p
                        className={`mt-1 border-b border-black pb-0.5 ${
                          plan.verificheValutazione.altriTipiProve.trim() ? 'italic' : ''
                        }`}
                      >
                        {plan.verificheValutazione.altriTipiProve.trim() || '\u00A0'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <>
            <h3
              className="border-b pb-0.5 text-sm font-bold uppercase"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              VERIFICHE IN ITINERE: MODALITÀ
            </h3>
            <table className="mt-2 w-full border-collapse border border-slate-400 text-sm">
              <thead>
                <tr className="text-white" style={{ backgroundColor: accentColor }}>
                  <th className="w-1/2 border border-slate-400 px-3 py-1 text-left">SCRITTA</th>
                  <th className="w-1/2 border border-slate-400 px-3 py-1 text-left">ORALE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {VERIFICHE_SCRITTE_OPTIONS.map((opt) =>
                        renderCheck(plan.verificheValutazione.verificheScritte.includes(opt), opt)
                      )}
                    </div>
                  </td>
                  <td className="border border-slate-400 px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {VERIFICHE_ORALI_OPTIONS.map((opt) =>
                        renderCheck(plan.verificheValutazione.verificheOrali.includes(opt), opt)
                      )}
                      {plan.verificheValutazione.altriTipiProve.trim() && (
                        <p className="mt-1 italic text-slate-700">
                          Altri tipi di prove: {plan.verificheValutazione.altriTipiProve}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Valutazione & Firma */}
      <section className="mt-6">
        <h3
          className={`pb-0.5 text-[13px] font-bold uppercase ${
            isOriginal ? 'text-left text-black' : 'border-b text-sm'
          }`}
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          VALUTAZIONE
        </h3>
        <p
          className={`mt-2 whitespace-pre-wrap ${
            isOriginal ? 'text-justify leading-[1.65]' : ''
          }`}
        >
          {plan.verificheValutazione.criteriValutazione}
        </p>
        <div
          className={`mt-8 whitespace-pre-line text-right ${isOriginal ? 'font-normal' : 'font-bold'}`}
          style={{ color: accentColor }}
        >
          {firmaDocente}
        </div>
      </section>
    </article>
  );
}
