# 🚀 Configurazione Variabili d'Ambiente su Vercel

## Problema Risolto
Il file `supabaseClient.js` ora usa le variabili d'ambiente invece di credenziali hardcoded.

## ✅ File Creati

1. **`.env.local`** - Per sviluppo locale (già configurato, non committare!)
2. **`.env.example`** - Template per altri sviluppatori
3. **`supabaseClient.js`** - Aggiornato per usare variabili d'ambiente

## 📝 Setup Vercel

### Passo 1: Vai su Vercel Dashboard
1. Apri: https://vercel.com/dashboard
2. Seleziona il tuo progetto `social-platform-web3`
3. Vai su **Settings** → **Environment Variables**

### Passo 2: Aggiungi le variabili

Clicca su **Add New** e aggiungi:

**Variabile 1:**
- **Name:** `REACT_APP_SUPABASE_URL`
- **Value:** `https://feocyyvlqkoudfgfcken.supabase.co`
- **Environment:** Production, Preview, Development (seleziona tutti e 3)

**Variabile 2:**
- **Name:** `REACT_APP_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlb2N5eXZscWtvdWRmZ2Zja2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NjExNTksImV4cCI6MjA3MzUzNzE1OX0.s9h34lE0ciyaKB3MLZDgXEXu6KJJ_l6tyeq-dKunHZ4`
- **Environment:** Production, Preview, Development (seleziona tutti e 3)

### Passo 3: Redeploy
Dopo aver aggiunto le variabili:
1. Vai su **Deployments**
2. Trova l'ultimo deployment
3. Clicca sui 3 puntini (**...**) → **Redeploy**
4. Conferma il redeploy

## 🔒 Sicurezza

- ✅ `.env.local` è già in `.gitignore` (non verrà committato)
- ✅ Le credenziali hanno un fallback per funzionare anche senza variabili d'ambiente
- ⚠️ La `ANON_KEY` è pubblica e sicura da condividere (è pensata per il frontend)

## 🧪 Test Locale

Per testare in locale:
```bash
npm start
```

Le variabili in `.env.local` verranno caricate automaticamente.

## 📋 Checklist Finale

- [ ] Variabili aggiunte su Vercel
- [ ] Redeploy eseguito
- [ ] App funziona in produzione
- [ ] La registrazione salva gli utenti su Supabase
