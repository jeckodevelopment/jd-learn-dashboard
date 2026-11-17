# JD Learn · Release dashboard

Dashboard pubblica di monitoraggio del rilascio JD Learn 1.0.0.

- **Sorgente**: [jeckodevelopment/jd_learn](https://github.com/jeckodevelopment/jd_learn)
- **Dati**: `data/snapshot.json` e `data/requirements.json`, generati da GitHub Actions ogni 30 minuti e manualmente
- **Frontend**: `web/`, statico e senza credenziali
- **Pubblicazione SFTP**: esclusivamente da `jeckodevelopment/jeckodevsite`, su `https://jeckodevelopment.com/dev/jdlearn/`.

Il browser carica i JSON direttamente da `raw.githubusercontent.com`, con query anti-cache; il sito dispone anche di una copia dei JSON come fallback. Timestamp, stato della sincronizzazione e fonte sono esposti nella UI. Nessuna credenziale o dato privato viene pubblicato.

Per eseguire localmente: `python scripts/sync.py` (usa `GITHUB_TOKEN` se presente). Il workflow `Refresh JD Learn dashboard data` esegue il job automaticamente.
