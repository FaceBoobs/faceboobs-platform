# 🧪 TESTING: Follow Counters Update

## ✅ MODIFICHE COMPLETATE

Ho aggiunto logging dettagliato alla funzione `updateFollowCounts()` in `supabaseService.js` (linee 636-731).

## 🔍 COSA CERCARE NELLA CONSOLE

Quando clicchi "Follow" su un profilo, nella console del browser dovresti vedere:

### 1. **Chiamata followUser**
```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
🔵 SupabaseService.followUser CHIAMATA
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
📊 Parametri:
   - followerAddress: 0xYOUR_ADDRESS
   - followedAddress: 0xTARGET_ADDRESS
```

### 2. **Insert nella tabella follows**
```
🔍 STEP 2: INSERT nella tabella follows...
✅ INSERT riuscito!
```

### 3. **IMPORTANTE: Aggiornamento contatori (STEP 3)**
```
🔍 STEP 3: Aggiorno contatori follow...
🔄 [SupabaseService] Updating follow counts...
   - Follower: 0xYOUR_ADDRESS
   - Followed: 0xTARGET_ADDRESS
```

### 4. **Conteggio followers/following**
```
📊 [SupabaseService] Counts calculated:
   - followersCount: X     👈 Quanti followers ha il target user
   - followingCount: Y     👈 Quanti following hai tu
```

### 5. **UPDATE 1: Followers count del target user**
```
🔍 [SupabaseService] UPDATE 1: Updating followers_count for: 0xtarget_address
   - Setting followers_count to: X

📬 [SupabaseService] UPDATE 1 Result:
   - Updated rows: 1       👈 DEVE ESSERE 1, non 0!
   - Data: [{...}]         👈 Mostra il record aggiornato
   - Error: null
```

**⚠️ SE Updated rows: 0**:
```
⚠️ [SupabaseService] UPDATE 1: No rows updated for followed user!
   - This means the user 0xtarget_address does NOT exist in users table
```
→ **Problema**: L'utente target NON esiste nella tabella `users` di Supabase

### 6. **UPDATE 2: Following count del tuo user**
```
🔍 [SupabaseService] UPDATE 2: Updating following_count for: 0xyour_address
   - Setting following_count to: Y

📬 [SupabaseService] UPDATE 2 Result:
   - Updated rows: 1       👈 DEVE ESSERE 1, non 0!
   - Data: [{...}]
   - Error: null
```

**⚠️ SE Updated rows: 0**:
```
⚠️ [SupabaseService] UPDATE 2: No rows updated for follower user!
   - This means the user 0xyour_address does NOT exist in users table
```
→ **Problema**: TU non esisti nella tabella `users` di Supabase

### 7. **Successo finale**
```
✅ [SupabaseService] Follow counts updated successfully
✅ Successfully followed user
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

---

## 🧪 PROCEDURA DI TEST

### Test 1: Follow un utente
1. **Apri la console del browser** (F12 → Console)
2. **Fai login** con il tuo wallet
3. **Clicca "Follow"** su un profilo suggerito
4. **Copia TUTTI i log** dalla console
5. **Cerca**:
   - "STEP 3: Aggiorno contatori follow" → Deve apparire
   - "UPDATE 1 Result: Updated rows:" → Deve essere 1
   - "UPDATE 2 Result: Updated rows:" → Deve essere 1

### Test 2: Verifica database
1. **Vai su Supabase Dashboard** → Table Editor
2. **Apri tabella `follows`**
   - Cerca il tuo indirizzo come `follower_address`
   - Verifica che ci sia il record del follow
3. **Apri tabella `users`**
   - Cerca il tuo indirizzo come `wallet_address`
   - Verifica che `following_count` sia aumentato
   - Cerca l'indirizzo del target user
   - Verifica che `followers_count` sia aumentato

### Test 3: Verifica UI
1. **Vai sul tuo profilo** (clicca avatar in alto)
2. **Controlla il contatore "Following"**
   - Deve mostrare il numero corretto
3. **Vai sul profilo dell'utente seguito**
4. **Controlla il contatore "Followers"**
   - Deve mostrare il numero corretto

---

## 🐛 POSSIBILI PROBLEMI E SOLUZIONI

### Problema 1: "Updated rows: 0" per entrambi gli UPDATE
**Causa**: Gli utenti non esistono nella tabella `users`
**Soluzione**: Verifica che tutti gli utenti siano registrati nel database

**Come verificare**:
```sql
-- Vai su Supabase SQL Editor
SELECT wallet_address, username, following_count, followers_count
FROM users
WHERE wallet_address IN ('0xyour_address', '0xtarget_address');
```

Se uno dei due utenti manca, devi registrarlo:
- Disconnetti e riconnetti il wallet
- Oppure controlla che la funzione `createOrUpdateUser` sia chiamata al login

### Problema 2: "Updated rows: 0" solo per UPDATE 1 (target user)
**Causa**: L'utente che stai seguendo non esiste nella tabella `users`
**Soluzione**: L'utente deve fare login almeno una volta per essere registrato

### Problema 3: "Updated rows: 0" solo per UPDATE 2 (tuo user)
**Causa**: Tu non esisti nella tabella `users`
**Soluzione**: Riconnetti il wallet o verifica il processo di registrazione

### Problema 4: UPDATE funziona ma UI non si aggiorna
**Causa**: Profile.js non ricarica i dati dopo follow
**Soluzione**: Già implementato - la pagina profilo ricarica da Supabase

### Problema 5: Case sensitivity degli indirizzi
**Causa**: Gli indirizzi nel database hanno case diverso
**Verifica**: Tutti gli indirizzi dovrebbero essere lowercase
```sql
-- Verifica case degli indirizzi
SELECT wallet_address, LOWER(wallet_address) = wallet_address as is_lowercase
FROM users;
```

---

## 📊 ESEMPIO DI LOG CORRETTO

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
🔵 SupabaseService.followUser CHIAMATA
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
📊 Parametri:
   - followerAddress: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   - followedAddress: 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
🔍 STEP 1: Controllo se già seguito...
✅ Non ancora seguito, procedo con INSERT
🔍 STEP 2: INSERT nella tabella follows...
✅ INSERT riuscito!
🔍 STEP 3: Aggiorno contatori follow...
🔄 [SupabaseService] Updating follow counts...
   - Follower: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   - Followed: 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
📊 [SupabaseService] Counts calculated:
   - followersCount: 1
   - followingCount: 1
🔍 [SupabaseService] UPDATE 1: Updating followers_count for: 0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199
   - Setting followers_count to: 1
📬 [SupabaseService] UPDATE 1 Result:
   - Updated rows: 1
   - Data: [{id: 123, wallet_address: '0x8626...', followers_count: 1, ...}]
   - Error: null
🔍 [SupabaseService] UPDATE 2: Updating following_count for: 0x742d35cc6634c0532925a3b844bc9e7595f0beb
   - Setting following_count to: 1
📬 [SupabaseService] UPDATE 2 Result:
   - Updated rows: 1
   - Data: [{id: 456, wallet_address: '0x742d...', following_count: 1, ...}]
   - Error: null
✅ [SupabaseService] Follow counts updated successfully
✅ Successfully followed user
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

---

## 🎯 CHECKLIST FINALE

Dopo il test, verifica che:

- [ ] Il log "STEP 3: Aggiorno contatori follow..." appare
- [ ] I conteggi sono corretti (followersCount e followingCount)
- [ ] UPDATE 1 mostra "Updated rows: 1"
- [ ] UPDATE 2 mostra "Updated rows: 1"
- [ ] Nessun warning "No rows updated"
- [ ] Il contatore nella UI si aggiorna correttamente
- [ ] Il database Supabase mostra i nuovi valori

---

## 📞 COSA INVIARE PER DEBUGGING

Se il problema persiste, inviami:

1. **Screenshot o copia completa dei log della console** (dalla riga con ▓▓▓ fino alla fine)
2. **Screenshot della tabella `users` su Supabase** (mostrando `wallet_address`, `following_count`, `followers_count`)
3. **Screenshot della tabella `follows` su Supabase** (mostrando le relazioni)

---

**Ultima modifica**: 2025-10-15
**File modificato**: `frontend/src/services/supabaseService.js` (linee 636-731)
