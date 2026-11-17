import {
  FONTI_RILEVAZIONE_OPTIONS,
  formatDocenteConTitolo,
  formatFirmaDocente,
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
import { getActiveDimensionsForDocument } from '../engine/classCharacteristicsEngine';
import {
  CURRICOLO_TYPE_LABELS,
  CURRICOLO_TYPE_ORDER,
} from '../engine/curricoloCatalogEngine';
import { buildClassCompositionIntro } from '../engine/questionnaireEngine';

interface DocumentSheetPreviewProps {
  plan: Programmazione;
  settings: SchoolSettings;
  mapping: DocxMappingSchema;
}

export function DocumentSheetPreview({
  plan,
  settings,
  mapping,
}: DocumentSheetPreviewProps) {
  const layoutStyle =
    plan.datiGenerali.layoutDocumento ?? settings.defaultLayoutDocumento ?? 'originale';
  const docenteGenere =
    plan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';
  const docenteNomeRaw =
    plan.verificheValutazione.firmaDocente || plan.datiGenerali.docente;
  const docenteConTitolo = formatDocenteConTitolo(plan.datiGenerali.docente, docenteGenere);
  const firmaDocente = formatFirmaDocente(docenteNomeRaw, docenteGenere);

  const isOriginal = layoutStyle === 'originale';
  const checkedGlyph = mapping.typography.checkedGlyph || '☒';
  const uncheckedGlyph = mapping.typography.uncheckedGlyph || '☐';
  const accentColor = isOriginal
    ? '#000000'
    : `#${mapping.typography.headingColorHex.replace('#', '') || '1F3864'}`;

  const activeCharacteristics = getActiveDimensionsForDocument(
    plan.situazione.caratteristicheDimensioni,
    settings.soglieQuoteCaratteristiche
  );
  const compositionIntro = buildClassCompositionIntro(plan);

  const renderCheck = (checked: boolean, label: string, bracketStyle = false) => {
    const marker = bracketStyle
      ? checked
        ? '[X]'
        : '[ ]'
      : checked
      ? checkedGlyph
      : uncheckedGlyph;
    return (
      <span
        key={label}
        className={`inline-flex items-baseline gap-1.5 ${
          checked ? 'font-semibold text-black' : 'text-slate-800'
        }`}
      >
        <span
          className={bracketStyle ? 'font-mono text-[12px]' : ''}
          style={{ color: checked ? accentColor : '#334155' }}
        >
          {marker}
        </span>
        <span>{label}</span>
      </span>
    );
  };

  const cellBorderClass = isOriginal ? 'border border-black' : 'border border-slate-400';

  return (
    <article
      aria-label="Anteprima documento programmazione"
      className="print-only-sheet font-doc mx-auto w-full max-w-[210mm] rounded-sm border border-slate-300 bg-white p-6 text-[14px] leading-[1.45] text-black shadow-sm sm:p-10"
    >
      {/* Intestazione istituzionale */}
      <header
        className={`pb-3 text-center ${
          isOriginal ? 'border-b-4 border-double border-black' : 'border-b-2 pb-4'
        }`}
        style={isOriginal ? undefined : { borderColor: accentColor }}
      >
        <p
          className={`text-xs font-bold tracking-wider uppercase ${
            isOriginal ? 'text-black' : ''
          }`}
          style={isOriginal ? undefined : { color: accentColor }}
        >
          {settings.ministryHeader || mapping.institutionHeader.ministry}
        </p>
        <h2
          className={`mt-1 text-lg font-bold sm:text-xl ${isOriginal ? 'text-black' : ''}`}
          style={isOriginal ? undefined : { color: accentColor }}
        >
          {settings.schoolName || mapping.institutionHeader.schoolName}
        </h2>
        <p className="mt-0.5 text-xs text-slate-700">
          {settings.schoolAddressLine || mapping.institutionHeader.addressLine}
        </p>
        <p className="text-xs text-slate-700">
          {settings.schoolContactsLine || mapping.institutionHeader.contactsLine}
        </p>
      </header>

      {/* Titolo */}
      <div className="my-5 text-center">
        <h1
          className="text-xl font-bold tracking-tight uppercase sm:text-2xl"
          style={{ color: accentColor }}
        >
          PROGRAMMAZIONE DISCIPLINARE di{' '}
          {plan.datiGenerali.titoloDisciplina || plan.datiGenerali.disciplina || '___________'}
        </h1>
      </div>

      {/* Dati Generali: fedele al modello originale oppure tabellare moderno */}
      {isOriginal ? (
        <div className="space-y-1 text-sm">
          <div className="border-b border-black pb-1 font-bold uppercase">
            SCUOLA {plan.datiGenerali.scuola}
          </div>
          <div className="border-b border-black pb-1 font-bold uppercase">
            PLESSO DI {plan.datiGenerali.plesso || '—'}
          </div>
          <div className="grid grid-cols-1 gap-y-1 pt-1.5 sm:grid-cols-2">
            <div>
              <strong>ANNO SCOLASTICO:</strong>{' '}
              <span className="tabular-nums">{plan.datiGenerali.annoScolastico}</span>
            </div>
            <div>
              <strong>CLASSE:</strong> {plan.datiGenerali.classe} {plan.datiGenerali.sezione}
            </div>
            <div>
              <strong>DISCIPLINA:</strong> {plan.datiGenerali.disciplina}
            </div>
            <div>
              <strong>DOCENTE:</strong> {docenteConTitolo}
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Composizione della classe */}
      <section className="mt-5">
        <h3
          className={`pb-0.5 text-sm font-bold uppercase ${
            isOriginal ? 'text-center text-black' : 'border-b'
          }`}
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          COMPOSIZIONE DELLA CLASSE
        </h3>
        <table className={`mt-2 w-full border-collapse text-center text-sm ${cellBorderClass}`}>
          <thead>
            <tr
              className={isOriginal ? 'bg-white text-black' : 'text-white'}
              style={isOriginal ? undefined : { backgroundColor: accentColor }}
            >
              <th className={`${cellBorderClass} px-2 py-1`}>Alunni</th>
              <th className={`${cellBorderClass} px-2 py-1`}>Maschi</th>
              <th className={`${cellBorderClass} px-2 py-1`}>Femmine</th>
              <th className={`${cellBorderClass} px-2 py-1`}>Ripetenti</th>
              <th className={`${cellBorderClass} px-2 py-1`}>
                Con Bisogni Educativi Speciali (BES)
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr>
              <td className={`${cellBorderClass} px-2 py-1.5 font-bold`}>
                {plan.composizione.alunni}
              </td>
              <td className={`${cellBorderClass} px-2 py-1.5`}>{plan.composizione.maschi}</td>
              <td className={`${cellBorderClass} px-2 py-1.5`}>{plan.composizione.femmine}</td>
              <td className={`${cellBorderClass} px-2 py-1.5`}>{plan.composizione.ripetenti}</td>
              <td className={`${cellBorderClass} px-2 py-1.5 font-bold`}>
                {plan.composizione.bes}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Situazione e Presentazione della classe */}
      <section className="mt-5">
        <h3
          className={`pb-0.5 text-sm font-bold uppercase ${
            isOriginal ? 'text-center text-black' : 'border-b'
          }`}
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          SITUAZIONE DELLA CLASSE
        </h3>
        {isOriginal ? (
          <table className="mt-2 w-full border-collapse border border-black text-sm">
            <tbody>
              <tr>
                <td className="w-1/2 border border-black px-3 py-2 align-top">
                  <p className="mb-1 text-center font-bold uppercase">TIPOLOGIA</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm">
                    {TIPOLOGIE_CLASSE_OPTIONS.map((opt) =>
                      renderCheck(plan.situazione.tipologie.includes(opt), opt, true)
                    )}
                  </div>
                </td>
                <td className="w-1/2 border border-black px-3 py-2 align-top">
                  <p className="mb-1 text-center font-bold uppercase">LIVELLO</p>
                  <div className="flex flex-col gap-1">
                    {LIVELLI_CLASSE_OPTIONS.map((opt) =>
                      renderCheck(plan.situazione.livello === opt.value, opt.label, false)
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black px-3 py-2">
                  <p className="mb-1 font-bold uppercase">
                    MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI:
                  </p>
                  <div className="flex flex-col gap-1">
                    {MEZZI_INDIVIDUAZIONE_OPTIONS.map((opt) =>
                      renderCheck(plan.situazione.mezziIndividuazione.includes(opt), opt, false)
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
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
        )}

        {/* Presentazione classe: sempre con totale, maschi, femmine + caratteristiche */}
        <div className={`mt-3 space-y-1.5 px-3 py-2 text-sm ${cellBorderClass}`}>
          <p className="text-xs font-bold uppercase" style={{ color: accentColor }}>
            Presentazione e caratteristiche della classe:
          </p>
          <p className="leading-snug text-slate-900">{compositionIntro}</p>
          {activeCharacteristics.map((item) => (
            <p key={item.id} className="leading-snug text-slate-900">
              <strong style={{ color: accentColor }}>{item.nome}:</strong> {item.testo}
            </p>
          ))}
        </div>
      </section>

      {/* Analisi della situazione di partenza */}
      <section className="mt-5">
        <h3
          className={`pb-0.5 text-sm font-bold uppercase ${
            isOriginal ? 'text-center text-black' : 'border-b'
          }`}
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          ANALISI DELLA SITUAZIONE DI PARTENZA
        </h3>
        <p className="mt-2 text-sm font-bold" style={{ color: accentColor }}>
          SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA:
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
          {plan.analisiPartenza.descrizioneDisciplinare.trim() ||
            `${compositionIntro}\nDescrizione sintetica della situazione di partenza non ancora compilata.`}
        </p>

        <table className={`mt-3 w-full border-collapse text-center text-xs sm:text-sm ${cellBorderClass}`}>
          <thead>
            <tr
              className={isOriginal ? 'bg-white text-black' : 'text-white'}
              style={isOriginal ? undefined : { backgroundColor: accentColor }}
            >
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
          </tbody>
        </table>

        <div className="mt-3">
          <p className="text-sm font-bold" style={{ color: accentColor }}>
            FONTI DI RILEVAZIONE DEI DATI:
          </p>
          <div className="mt-1 flex flex-col gap-1 text-sm">
            {FONTI_RILEVAZIONE_OPTIONS.map((opt) =>
              renderCheck(plan.analisiPartenza.fontiRilevazione.includes(opt), opt)
            )}
            {plan.analisiPartenza.altraFonte.trim() && (
              <p className="italic text-slate-700">Altro: {plan.analisiPartenza.altraFonte}</p>
            )}
          </div>
        </div>
      </section>

      {/* Strategie e interventi */}
      <section className="mt-5">
        <div
          className={
            isOriginal
              ? 'border border-black px-3 py-1.5 text-center font-bold uppercase'
              : 'border-b pb-0.5 text-sm font-bold uppercase'
          }
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          STRATEGIE ED INTERVENTI PER IL POTENZIAMENTO, IL CONSOLIDAMENTO ED IL RECUPERO
        </div>
        <table
          className={`w-full border-collapse text-sm ${
            isOriginal ? 'border-x border-b border-black' : 'mt-2 border border-slate-400'
          }`}
        >
          <thead>
            <tr
              className={isOriginal ? 'bg-white text-black' : 'text-white'}
              style={isOriginal ? undefined : { backgroundColor: accentColor }}
            >
              <th className={`w-1/4 ${cellBorderClass} px-3 py-1 text-left`}>
                {isOriginal ? 'Gruppi di livello' : 'Gruppo di livello'}
              </th>
              <th className={`${cellBorderClass} px-3 py-1 text-left`}>
                {isOriginal ? 'STRATEGIE DA UTILIZZARE' : 'Strategie ed interventi programmati'}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                className={`${cellBorderClass} px-3 py-2 font-bold align-top`}
                style={{ color: accentColor }}
              >
                POTENZIAMENTO
              </td>
              <td className={`${cellBorderClass} px-3 py-2`}>
                <div className="flex flex-col gap-1">
                  {STRATEGIE_POTENZIAMENTO_OPTIONS.map((opt) =>
                    renderCheck(plan.interventi.potenziamento.includes(opt), opt)
                  )}
                  {plan.interventi.potenziamentoAltro.trim() && (
                    <p className="italic text-slate-700">
                      Altro: {plan.interventi.potenziamentoAltro}
                    </p>
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td
                className={`${cellBorderClass} px-3 py-2 font-bold align-top`}
                style={{ color: accentColor }}
              >
                CONSOLIDAMENTO
              </td>
              <td className={`${cellBorderClass} px-3 py-2`}>
                <div className="flex flex-col gap-1">
                  {STRATEGIE_CONSOLIDAMENTO_OPTIONS.map((opt) =>
                    renderCheck(plan.interventi.consolidamento.includes(opt), opt)
                  )}
                  {plan.interventi.consolidamentoAltro.trim() && (
                    <p className="italic text-slate-700">
                      Altro: {plan.interventi.consolidamentoAltro}
                    </p>
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td
                className={`${cellBorderClass} px-3 py-2 font-bold align-top`}
                style={{ color: accentColor }}
              >
                RECUPERO
              </td>
              <td className={`${cellBorderClass} px-3 py-2`}>
                <div className="flex flex-col gap-1">
                  {STRATEGIE_RECUPERO_OPTIONS.map((opt) =>
                    renderCheck(plan.interventi.recupero.includes(opt), opt)
                  )}
                  {plan.interventi.recuperoAltro.trim() && (
                    <p className="italic text-slate-700">
                      Altro: {plan.interventi.recuperoAltro}
                    </p>
                  )}
                </div>
              </td>
            </tr>
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
          </tbody>
        </table>
      </section>

      {/* Curricolo */}
      <section className="mt-5">
        <div
          className={
            isOriginal
              ? 'border border-black px-3 py-1.5 text-center font-bold uppercase'
              : 'border-b pb-0.5 text-sm font-bold uppercase'
          }
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO
        </div>
        <p className="mt-2 italic text-slate-800">{plan.curricolo.notaIntroduttiva}</p>

        {plan.curricolo.competenzeAttese.length > 0 && (
          <div className="mt-2">
            <p className="font-bold" style={{ color: accentColor }}>
              Traguardi e competenze attese:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {plan.curricolo.competenzeAttese.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {plan.curricolo.competenzeDigitali.length > 0 && (
          <div className="mt-2">
            <p className="font-bold" style={{ color: accentColor }}>
              Competenze digitali (DigComp 2.2) e trasversali:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {plan.curricolo.competenzeDigitali.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {(plan.curricolo.vociCatalogoImportate?.length ?? 0) > 0 && (
          <div className="mt-3 space-y-2">
            <p className="font-bold" style={{ color: accentColor }}>
              Voci importate dal Curricolo Verticale:
            </p>
            {CURRICOLO_TYPE_ORDER.map((tipo) => {
              const items = (plan.curricolo.vociCatalogoImportate ?? []).filter(
                (v) => v.tipo === tipo && v.testo.trim()
              );
              if (items.length === 0) return null;
              return (
                <div key={tipo} className="mt-1">
                  <p className="text-xs font-bold uppercase text-slate-800">
                    {CURRICOLO_TYPE_LABELS[tipo]}
                  </p>
                  <ul className="mt-0.5 list-disc pl-5">
                    {items.map((item) => (
                      <li key={item.id}>
                        {item.nucleoTematico ? <strong>[{item.nucleoTematico}] </strong> : null}
                        {item.testo}
                        {item.classeOrigine !== plan.datiGenerali.classe && (
                          <span className="italic text-slate-600">
                            {' '}
                            (Provenienza: Classe {item.classeOrigine})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabella 3 colonne: COMPETENZE | ABILITÀ / OBIETTIVI | CONOSCENZE (CONTENUTI) */}
        <table className={`mt-3 w-full border-collapse text-xs sm:text-sm ${cellBorderClass}`}>
          <thead>
            <tr
              className={isOriginal ? 'bg-white text-black' : 'text-white'}
              style={isOriginal ? undefined : { backgroundColor: accentColor }}
            >
              <th className={`w-1/3 ${cellBorderClass} px-2.5 py-1.5 text-left`}>
                COMPETENZE
              </th>
              <th className={`w-1/3 ${cellBorderClass} px-2.5 py-1.5 text-left`}>
                ABILITÀ / OBIETTIVI
              </th>
              <th className={`w-1/3 ${cellBorderClass} px-2.5 py-1.5 text-left`}>
                CONOSCENZE (CONTENUTI)
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.curricolo.righeAbilitaConoscenze.length > 0 ? (
              plan.curricolo.righeAbilitaConoscenze.map((row) => (
                <tr key={row.id}>
                  <td className={`${cellBorderClass} px-2.5 py-2 align-top whitespace-pre-wrap`}>
                    {row.competenze || row.traguardo || '—'}
                  </td>
                  <td className={`${cellBorderClass} px-2.5 py-2 align-top whitespace-pre-wrap`}>
                    {row.abilita || '—'}
                  </td>
                  <td className={`${cellBorderClass} px-2.5 py-2 align-top whitespace-pre-wrap`}>
                    {row.conoscenze || '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className={`${cellBorderClass} px-3 py-3 italic text-slate-500`}>
                  Nessuna riga di competenze, abilità e conoscenze ancora inserita.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {plan.curricolo.attivitaProgrammate.trim() && (
          <div className="mt-3">
            <p className="font-bold" style={{ color: accentColor }}>
              Attività programmate:
            </p>
            <p className="whitespace-pre-wrap">{plan.curricolo.attivitaProgrammate}</p>
          </div>
        )}
      </section>

      {/* Criteri metodologici */}
      <section className="mt-5">
        <h3
          className={`pb-0.5 text-sm font-bold uppercase ${
            isOriginal ? 'text-center underline text-black' : 'border-b'
          }`}
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          CRITERI METODOLOGICI, STRATEGIE, STRUMENTI:
        </h3>
        <p className="mt-2 whitespace-pre-wrap">{plan.metodiStrumenti.premessaMetodologica}</p>

        <table className={`mt-3 w-full border-collapse text-sm ${cellBorderClass}`}>
          <thead>
            <tr
              className={isOriginal ? 'bg-white text-black' : 'text-white'}
              style={isOriginal ? undefined : { backgroundColor: accentColor }}
            >
              <th className={`w-1/2 ${cellBorderClass} px-3 py-1 text-left`}>METODI</th>
              <th className={`w-1/2 ${cellBorderClass} px-3 py-1 text-left`}>
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
                  {plan.metodiStrumenti.altreMetodologie.trim() && (
                    <p className="mt-1 italic text-slate-700">
                      Altre metodologie: {plan.metodiStrumenti.altreMetodologie}
                    </p>
                  )}
                </div>
              </td>
              <td className={`${cellBorderClass} px-3 py-2 align-top`}>
                <div className="flex flex-col gap-1">
                  {MEZZI_STRUMENTI_OPTIONS.map((opt) =>
                    renderCheck(plan.metodiStrumenti.mezziEStrumenti.includes(opt), opt)
                  )}
                  {plan.metodiStrumenti.altriSussidi.trim() && (
                    <p className="mt-1 italic text-slate-700">
                      Altri sussidi: {plan.metodiStrumenti.altriSussidi}
                    </p>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {plan.metodiStrumenti.ausiliDidattici.trim() && (
          <div className="mt-3">
            <p className="font-bold" style={{ color: accentColor }}>
              AUSILI DIDATTICI:
            </p>
            <p className="whitespace-pre-wrap">{plan.metodiStrumenti.ausiliDidattici}</p>
          </div>
        )}

        <div className="mt-3">
          <p className="font-bold" style={{ color: accentColor }}>
            DIDATTICA DIGITALE INTEGRATA:
          </p>
          <p className="whitespace-pre-wrap">{plan.metodiStrumenti.didatticaDigitaleIntegrata}</p>
        </div>
      </section>

      {/* Verifiche */}
      <section className="mt-5">
        {isOriginal ? (
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr>
                <th colSpan={2} className="border border-black px-3 py-1 text-center font-bold uppercase">
                  VERIFICHE IN ITINERE: MODALITÀ
                </th>
              </tr>
              <tr>
                <th className="w-1/2 border border-black px-3 py-1 text-left">SCRITTA</th>
                <th className="w-1/2 border border-black px-3 py-1 text-left">ORALE</th>
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
                  </div>
                </td>
              </tr>
              {plan.verificheValutazione.altriTipiProve.trim() && (
                <tr>
                  <td colSpan={2} className="border border-black px-3 py-2">
                    <strong>ALTRI TIPI DI PROVE:</strong> {plan.verificheValutazione.altriTipiProve}
                  </td>
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
      <section className="mt-5">
        <h3
          className={`pb-0.5 text-sm font-bold uppercase ${
            isOriginal ? 'text-center text-black' : 'border-b'
          }`}
          style={isOriginal ? undefined : { color: accentColor, borderColor: accentColor }}
        >
          VALUTAZIONE
        </h3>
        <p className="mt-2 whitespace-pre-wrap">{plan.verificheValutazione.criteriValutazione}</p>
        <div className="mt-8 text-right font-bold" style={{ color: accentColor }}>
          {firmaDocente}
        </div>
      </section>
    </article>
  );
}
