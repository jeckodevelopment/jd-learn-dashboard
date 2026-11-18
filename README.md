# JD Learn · Release dashboard

Dashboard pubblica di monitoraggio del rilascio JD Learn 1.0.0.

- **Sorgente**: [jeckodevelopment/jd_learn](https://github.com/jeckodevelopment/jd_learn)
- **Dati**: `data/snapshot.json` e `data/requirements.json`, generati da GitHub Actions ogni 30 minuti e manualmente
- **Frontend**: `web/`, statico e senza credenziali
- **Pubblicazione SFTP**: esclusivamente da `jeckodevelopment/jeckodevsite`, su `https://jeckodevelopment.com/dev/jdlearn/`.

Il browser carica i JSON direttamente da `raw.githubusercontent.com`, con query anti-cache; il sito dispone anche di una copia dei JSON come fallback. Timestamp, stato della sincronizzazione e fonte sono esposti nella UI. Nessuna credenziale o dato privato viene pubblicato.

Per eseguire localmente: `python scripts/sync.py` (usa `GITHUB_TOKEN` se presente). Il workflow `Refresh JD Learn dashboard data` esegue il job automaticamente.

## Affidabilità della sincronizzazione

Il workflow [Refresh JD Learn dashboard data](https://github.com/jeckodevelopment/jd-learn-dashboard/actions/workflows/refresh.yml) è pianificato ai minuti 07 e 37 di ogni ora (UTC), con avvio manuale tramite `workflow_dispatch`. La pianificazione GitHub Actions è **best effort**: può partire in ritardo oppure essere saltata; il cron da solo non garantisce l'aggiornamento ogni 30 minuti.

A ogni avvio, lo script prova fino a tre volte a produrre lo snapshot se incontra errori temporanei; i JSON vengono validati e il timestamp deve essere recente (meno di 10 minuti). Un errore interrompe il workflow senza creare un commit con dati inattendibili. Il riepilogo del job include l'esito e il link all'esecuzione in caso di errore.

La UI segnala dati **non aggiornati** dopo 90 minuti. Per diagnosticare un blocco, verificare l'ultimo commit di `data/snapshot.json` e la cronologia del workflow: se mancano del tutto le esecuzioni, controllare se GitHub ha disabilitato il workflow schedulato (per inattività o impostazioni Actions); in tal caso il retry nello script non può risolvere il mancato avvio. Se invece i run sono presenti e falliti, consultare lo step fallito. Dopo il ripristino, avviare manualmente il workflow e verificare la data `generatedAt`.

La pubblicazione dei file statici via SFTP è indipendente e resta di competenza di `jeckodevsite`. Il browser legge i dati direttamente dalla repository dedicata.

## Aggiornamento su merge JD Learn

Oltre al cron semiorario e all'avvio manuale, il workflow `refresh.yml` accetta l'evento `repository_dispatch` di tipo `jdlearn-main-updated`. Il repository sorgente invia questo evento ad ogni push su `main` tramite `.github/workflows/notify-dashboard.yml`. I merge su main sono quindi coperti, anche quando il trigger a tempo tarda.

**Configurazione una tantum necessaria:** creare un fine-grained personal access token limitato al solo repository `jeckodevelopment/jd-learn-dashboard`, autorizzazione repository `Contents: Read and write` (necessaria per `POST /repos/{owner}/{repo}/dispatches`). Salvare il token come secret Actions `DASHBOARD_DISPATCH_TOKEN` nel repository `jeckodevelopment/jd_learn`. Non inserirlo nel codice, nel sito o nei log. In alternativa utilizzare un GitHub App installation token con autorizzazione equivalente e provisioning gestito.

In assenza del secret, il job del repository sorgente mostra un warning e termina senza errori; i refresh schedulati restano operativi. Dopo la configurazione verificare un nuovo push/merge su `jd_learn/main`, il job `Notify JD Learn release dashboard`, la run `Refresh JD Learn dashboard data` di tipo `repository_dispatch`, e il timestamp `generatedAt` in `data/snapshot.json`. L'interfaccia della dashboard legge direttamente il JSON dal repository.


## Misure di avanzamento JD Learn 1.0.0

La dashboard mostra due percentuali indipendenti, entrambe derivate dalle evidenze ufficiali nel repository `jeckodevelopment/jd_learn`:

- `developmentProgress`: soglia minima confermata dalle evidenze funzionali; i criteri non verificabili o non valutati non contribuiscono come completati.
- `manualAcceptanceProgress`: requisiti del perimetro 1.0.0 con un esito di collaudo manuale registrato (anche parziale), sul totale dei requisiti in perimetro. La CI non incrementa questa copertura; un esito parziale non equivale ad accettazione completa.

Lo snapshot mantiene `progress` come alias retrocompatibile di `developmentProgress`. Il conteggio dei requisiti con esito, non eseguiti, parziali e accettati è esposto in `manualAcceptance`. I collaudi Joomla possono essere registrati successivamente nella matrice e nel registro delle evidenze manuali.
