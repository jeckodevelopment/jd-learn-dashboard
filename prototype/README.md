# Prototipo Release Control Center v2 — NON PUBBLICARE

Il prototipo approvabile vive in `prototype/` e **non** sostituisce la directory `web/` utilizzata dal publisher SFTP.

## Avvio

1. Scaricare il branch `design/release-control-center-v2` come ZIP dalla repository GitHub.
2. Estrarre e aprire `prototype/index.html` in un browser con accesso Internet.
3. Consultare le viste Control Center, Funzionalità, Sviluppo, Collaudi Joomla, Release readiness.
4. Provare filtri, ricerca, pannello di dettaglio dei requisiti e selettore tema.

I JSON sono letti dalla branch pubblicata `main/data/` come **sorgente live di sola lettura**; la preview non genera dati fittizi e non salva modifiche in GitHub. Il timestamp e l'eventuale obsolescenza (>90 minuti) sono mostrati nell'interfaccia.

## Regole di rappresentazione

- CI: gate obbligatorio del processo di merge; non mostrato come KPI né come collaudo manuale.
- Implementazione: `Stato implementazione` della matrice ufficiale.
- Collaudo: `Accettazione Joomla` della stessa matrice.
- Completamento globale: `current_implementation_estimate.macroareas` dal documento ufficiale di evidenza, non un rapporto fra PR.
- Conteggio dei requisiti incompleti: righe `1.0.0` e `Misto` il cui stato non è `Completata`. Per `Misto` la voce può includere lavorazioni di fase 2: aprire il dettaglio per verificarlo. Non usare il conteggio come percentuale ponderata.
- Gate di release: valori derivabili dalla matrice sono distinti dai gate che richiedono un'accettazione esplicita, visualizzati come «Da verificare».
- Prossime azioni: elenco di attenzione dalla fonte GitHub (issue P0/P1, requisiti incompleti, verifiche manuali pendenti). **L'ordinamento fine dei requisiti all'interno della stessa categoria è provvisorio**, da approvare prima del passaggio in produzione.
- Le percentuali delle singole schede di area sono rapporti semplici, non stime ponderate di progresso macroarea.

## Non ancora incluso

- Workflow scrittura dei collaudi: solo lettura.
- Motore di priorità avanzato con motivazione di ranking.
- Evidenze degli ultimi collaudi da QA_TESTBOOK e documenti dedicati.
- Controlli automatici di accessibilità e test end-to-end della UI.

## Checklist per il feedback

- [ ] Densità leggibile su 13–15 pollici senza grandi spazi vuoti
- [ ] Homepage orientata alle decisioni, non a dati meramente descrittivi
- [ ] Raggruppamenti e nomenclatura funzionalità comprensibili
- [ ] Test manuali Joomla distinti dall'implementazione
- [ ] Readiness non dichiara gate superati senza prove
- [ ] Navigazione e pannello dettagli funzionano su smartphone
- [ ] Design chiaro/scuro adeguato
- [ ] Nessun deploy su `jeckodevelopment.com/dev/jdlearn/`

## Dopo approvazione

Trasferire solo i file approvati da `prototype/` a `web/`, aggiungere test e predisporre un deploy manuale controllato tramite `jeckodevsite`. Il merge di questa PR **non deve** di per sé aggiornare il sito.
