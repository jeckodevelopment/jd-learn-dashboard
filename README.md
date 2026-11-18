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
