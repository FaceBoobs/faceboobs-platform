# 🔍 Debug Supabase - Tabella Users

## Problema
Gli utenti non vengono salvati nella tabella `users` durante la registrazione.

## ✅ Checklist di Debug

### 1. Testa la connessione Supabase
Dopo aver avviato l'app, apri la console del browser e esegui:

```javascript
window.testSupabase()
```

Questo test ti dirà:
- ✅ Se riesci a leggere dalla tabella `users`
- ✅ Se riesci a inserire nella tabella `users`
- ❌ Quale errore specifico blocca l'inserimento

### 2. Verifica Row Level Security (RLS)

**Il problema più comune è RLS attivo senza policy.**

#### Come verificare su Supabase Dashboard:

1. Vai su: https://feocyyvlqkoudfgfcken.supabase.co
2. Seleziona `Table Editor` → `users`
3. Clicca su `RLS` in alto
4. Verifica lo stato di **Row Level Security**

#### Soluzioni possibili:

**Opzione A: Disabilita RLS (solo per testing)**
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Opzione B: Aggiungi policy per permettere inserimenti (consigliato)**
```sql
-- Policy per permettere a tutti di inserire
CREATE POLICY "Enable insert for all users"
ON users FOR INSERT
TO public
WITH CHECK (true);

-- Policy per permettere a tutti di leggere
CREATE POLICY "Enable read access for all users"
ON users FOR SELECT
TO public
USING (true);
```

### 3. Verifica la struttura della tabella

Esegui questa query nel SQL Editor di Supabase:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Struttura attesa:**
- `id` (int4, NOT NULL, auto-increment)
- `avatar_url` (text, nullable)
- `is_creator` (boolean, default: false)
- `followers_count` (int4, default: 0)
- `following_count` (int4, default: 0)
- `created_at` (timestamptz, auto-generato)

### 4. Test manuale inserimento

Nel SQL Editor, prova:

```sql
INSERT INTO users (avatar_url, is_creator, followers_count, following_count)
VALUES ('test', false, 0, 0)
RETURNING *;
```

Se questo fallisce, il problema è a livello di database (permessi, constraint, etc).
Se funziona, il problema è nel codice frontend.

### 5. Controlla i log della registrazione

Quando registri un utente, dovresti vedere questi log nella console:

```
📝 Preparando dati per Supabase...
Account address: 0x...
Avatar hash: img_...
📤 Dati da inserire in Supabase: { avatar_url: ..., is_creator: false, ... }
🔄 Inserting user into Supabase...
📊 Data to insert: { ... }
✅ Supabase insert successful
✅ Inserted data: [{ id: ..., ... }]
```

Se vedi errori, nota:
- `error.code` (es: '42501' = permission denied)
- `error.message` (descrizione errore)
- `error.details` (dettagli aggiuntivi)

## 🎯 Prossimi passi

1. Esegui `window.testSupabase()` nella console
2. Copia l'output completo
3. Controlla le policy RLS su Supabase
4. Prova l'inserimento SQL manuale
5. Riprova la registrazione e copia i nuovi log

## 📋 Codice attuale

**File:** `src/contexts/Web3Context.js:238-266`

```javascript
const userData = {
  avatar_url: avatarHash !== 'QmDefaultAvatar' ? avatarHash : null,
  is_creator: false,
  followers_count: 0,
  following_count: 0
};

const supabaseResult = await SupabaseService.createUser(userData);
```

**File:** `src/services/supabaseService.js:364-390`

```javascript
static async createUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select();
  // ... error handling con logging dettagliato
}
```
