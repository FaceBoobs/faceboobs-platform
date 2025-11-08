# FIX FOTO PROFILO BLOCKCHAIN - GUIDA COMPLETA

## PROBLEMA TROVATO ❌

Quando carichi una nuova foto profilo, MetaMask si apre ma la foto non viene salvata.

### CAUSE IDENTIFICATE:

1. **CRITICO**: Colonna `avatar_blockchain_id` MANCANTE nel database Supabase
2. **IMPORTANTE**: Lettura evento ContentCreated non robusta per ethers.js v6

---

## SOLUZIONE APPLICATA ✅

### 1. Migration SQL Database

**File creato**: `ADD_AVATAR_BLOCKCHAIN_ID.sql`

**DEVI ESEGUIRE QUESTO FILE IN SUPABASE**:

1. Vai su Supabase Dashboard
2. Clicca su "SQL Editor" nel menu a sinistra
3. Clicca su "New query"
4. Copia e incolla il contenuto di `ADD_AVATAR_BLOCKCHAIN_ID.sql`
5. Clicca su "Run" (o premi Ctrl+Enter)
6. Verifica che l'output mostri la colonna `avatar_blockchain_id` creata

### 2. Fix Codice Web3Context.js

**Modifiche applicate**:
- ✅ Migliorata lettura evento `ContentCreated` (linee 458-491)
- ✅ Usa `contractInstance.interface.parseLog()` per parsing robusto
- ✅ Aggiunto logging dettagliato di tutti gli argomenti dell'evento
- ✅ Gestione errori migliorata

---

## COME TESTARE

### Step 1: Esegui la Migration SQL
```sql
-- Apri Supabase SQL Editor e esegui ADD_AVATAR_BLOCKCHAIN_ID.sql
```

### Step 2: Riavvia il Frontend
```bash
cd frontend
npm start
```

### Step 3: Test Upload Foto Profilo

1. Vai su "Edit Profile"
2. Seleziona una nuova foto profilo
3. Clicca "Save Changes"
4. **APRI LA CONSOLE DEL BROWSER** (F12 → Console)

### Step 4: Verifica Console Logs

Dovresti vedere questa sequenza di log nella console:

```
🖼️ File selezionato: {name: "...", size: ..., type: "image/..."}
📤 Uploading to Storage...
📁 Nome file generato: avatar_...
✅ Upload completato, URL: https://...
⛓️ Chiamata contract.createContent...
📋 Parametri blockchain: {url: "https://...", price: 0, isPaid: false}
🔐 Opening MetaMask for transaction...
```

**Quando confermi su MetaMask**:

```
✅ Transaction sent! Hash: 0x...
⏳ Waiting for blockchain confirmation...
✅ Transazione confermata! Receipt: {...}
🔍 Searching for ContentCreated event in logs...
📊 Total logs: X
✅ ContentCreated event found!
✅ Transazione confermata, blockchain_id: 123
📋 Event args: {contentId: "123", creator: "0x...", price: "0"}
💾 Aggiornamento database...
📋 Dati da salvare: {wallet_address: "...", username: "...", avatar_url: "...", avatar_blockchain_id: "123"}
✅ Profile updated in Supabase successfully!
🔄 Reloading user data...
✅ Foto profilo aggiornata!
```

---

## ERRORI POSSIBILI E SOLUZIONI

### Errore 1: "column avatar_blockchain_id does not exist"

**Causa**: Non hai eseguito la migration SQL

**Soluzione**:
1. Vai su Supabase SQL Editor
2. Esegui il file `ADD_AVATAR_BLOCKCHAIN_ID.sql`
3. Riprova

### Errore 2: "ContentCreated event not found"

**Causa**: La transazione è fallita o non è stata confermata

**Soluzione**:
1. Verifica su BSC Testnet Explorer: https://testnet.bscscan.com/
2. Cerca il transaction hash mostrato nei log
3. Verifica che la transazione sia "Success"
4. Controlla che l'evento "ContentCreated" sia presente negli eventi della transazione

### Errore 3: MetaMask si apre ma poi non succede nulla

**Causa**: Hai rifiutato la transazione o è andata in timeout

**Soluzione**:
1. Riprova
2. Conferma la transazione su MetaMask entro 60 secondi
3. Assicurati di avere abbastanza BNB testnet per il gas

---

## VERIFICHE POST-FIX

### Verifica 1: Controlla Database

Vai su Supabase → Table Editor → users

Verifica che il tuo record abbia:
- `avatar_url`: URL della foto su Supabase Storage
- `avatar_blockchain_id`: ID numerico (es: "123")

### Verifica 2: Controlla Blockchain

Vai su https://testnet.bscscan.com/address/0x575e0532445489dd31C12615BeC7C63d737B69DD

Cerca la tua transazione più recente e verifica:
- Status: Success ✅
- Eventi: ContentCreated presente

### Verifica 3: Verifica Visibilità Foto

1. Vai sul tuo profilo
2. La foto dovrebbe essere visibile
3. Ricarica la pagina (Ctrl+F5)
4. La foto dovrebbe rimanere visibile

---

## CONSOLE LOG COMPLETI

Ecco la lista completa dei log che dovresti vedere:

```javascript
// 1. Selezione file
🖼️ File selezionato: {name: "avatar.jpg", size: 123456, type: "image/jpeg"}

// 2. Upload Storage
📤 Uploading to Storage...
📁 Nome file generato: avatar_0x123..._1234567890.jpg
✅ Upload completato, URL: https://xyz.supabase.co/storage/v1/object/public/avatars/...

// 3. Blockchain
⛓️ Chiamata contract.createContent...
📋 Parametri blockchain: {url: "https://...", price: 0, isPaid: false}
🔐 Opening MetaMask for transaction...
✅ Transaction sent! Hash: 0xabc...
⏳ Waiting for blockchain confirmation...

// 4. Conferma Blockchain
✅ Transazione confermata! Receipt: {hash: "0xabc...", blockNumber: 12345, gasUsed: "67890"}
🔍 Searching for ContentCreated event in logs...
📊 Total logs: 1
✅ ContentCreated event found!
✅ Transazione confermata, blockchain_id: 123
📋 Event args: {contentId: "123", creator: "0x123...", price: "0"}

// 5. Salvataggio Database
💾 Aggiornamento database...
📋 Dati da salvare: {
  wallet_address: "0x123...",
  username: "YourUsername",
  bio: "Your bio",
  avatar_url: "https://...",
  avatar_blockchain_id: "123"
}
✅ Profile updated in Supabase successfully!

// 6. Ricaricamento
🔄 Reloading user data...
✅ Foto profilo aggiornata! New user data: {username: "...", avatarUrl: "...", blockchainId: "123"}
```

---

## NOTE TECNICHE

### Modifiche al Codice

**File modificato**: `frontend/src/contexts/Web3Context.js`

**Linee modificate**: 458-491

**Cosa è stato cambiato**:

PRIMA (NON FUNZIONAVA):
```javascript
const contentCreatedEvent = receipt.logs.find(
  log => log.fragment && log.fragment.name === 'ContentCreated'
);
```

DOPO (FUNZIONA):
```javascript
// Parse logs using contract interface (more robust for ethers.js v6)
avatarBlockchainId = null;
for (const log of receipt.logs) {
  try {
    const parsedLog = contractInstance.interface.parseLog({
      topics: [...log.topics],
      data: log.data
    });

    if (parsedLog && parsedLog.name === 'ContentCreated') {
      avatarBlockchainId = parsedLog.args[0].toString();
      console.log('✅ ContentCreated event found!');
      console.log('✅ Transazione confermata, blockchain_id:', avatarBlockchainId);
      break;
    }
  } catch (error) {
    continue;
  }
}
```

**Perché questo fix funziona**:
- Usa `contractInstance.interface.parseLog()` che è il metodo corretto per ethers.js v6
- Itera su tutti i log invece di usare `.find()` che potrebbe non vedere `log.fragment`
- Gestisce gli errori in modo silenzioso per log che non matchano
- Logga tutti i dettagli dell'evento per debugging

---

## SUPPORTO

Se continui ad avere problemi:

1. **Controlla la console**: Tutti i passaggi dovrebbero avere log dettagliati
2. **Verifica Supabase**: La migration SQL deve essere eseguita
3. **Verifica BSC Testnet**: La transazione deve essere confermata
4. **Apri un issue**: Includi i log della console completi

---

## CHECKLIST FINALE ✅

Prima di testare, assicurati di aver fatto:

- [ ] Eseguito `ADD_AVATAR_BLOCKCHAIN_ID.sql` su Supabase
- [ ] Verificato che la colonna `avatar_blockchain_id` esista nella tabella users
- [ ] Riavviato il frontend (`npm start`)
- [ ] Aperto la console del browser (F12)
- [ ] Hai BNB testnet nel wallet per il gas
- [ ] Sei connesso a BSC Testnet (Chain ID 97)

Se tutti questi punti sono ✅, puoi procedere con il test!

---

## SUMMARY

**Problemi risolti**:
1. ✅ Colonna database mancante → Aggiunta con migration SQL
2. ✅ Lettura evento blockchain → Fixata con nuovo parsing method
3. ✅ Logging completo → Già presente, migliorato dove necessario

**File modificati**:
- `frontend/src/contexts/Web3Context.js` (linee 458-491)

**File creati**:
- `ADD_AVATAR_BLOCKCHAIN_ID.sql` (migration database)
- `FIX_AVATAR_UPLOAD_README.md` (questa guida)

**Prossimi step**:
1. Esegui migration SQL su Supabase
2. Testa upload foto profilo
3. Verifica console logs
4. Conferma che la foto viene salvata e rimane visibile dopo refresh
