# Security Specification & Payload-First TDD — Numera

## 1. Data Invariants

1. **Identity & PII Isolation**: `users/{uid}` is strictly readable and writable only by `request.auth.uid == uid` with verified email (`email_verified == true`). No user directory listing is permitted.
2. **Master Gate Membership**: Every subcollection under `rifas/{rifaId}` (`participantes`, `numeros`, `atribuicoes`, `sorteios`, `eventos`, `convites`, `membros`) derives authorization from the parent `rifas/{rifaId}` owner or an active `rifas/{rifaId}/membros/{uid}` document (`status == 'ativo'`).
3. **No Self-Assigned Roles**: A user cannot create a `membros/{uid}` document with `role: 'colaborador'` or `role: 'proprietario'` unless they are the raffle `ownerId` (or creating their own initial `'proprietario'` record atomically alongside `rifas/{rifaId}`), or accepting an authentic `'pendente'` `convites/{conviteId}` matching their verified email and exact invited role/permissions while atomically transitioning the invite to `'aceito'`.
4. **Role-Based Permissions Matrix**:
   - **Proprietário**: Full configuration, team management, assignment management, confirmation/release, draw execution, and archiving.
   - **Colaborador**: Can register participants, assign numbers, manage others' assignments, confirm/release numbers; optional permissions for configuration, team management, and draw execution. Cannot archive raffles.
   - **Vendedor**: Can register participants, assign available numbers, and release their own unconfirmed reservations/assignments. Cannot manage others' assignments, cannot manage team, cannot run draws, cannot configure or archive raffles, and can confirm/release others' numbers only when `permissions.confirmarLiberar == true`.
5. **Terminal State Locking**:
   - Once `rifas/{rifaId}.status == 'arquivada'`, no updates are permitted.
   - Once `convites/{conviteId}.status` is `'aceito'` or `'revogado'`, no updates are permitted.
   - `sorteios/{sorteioId}` and `eventos/{eventoId}` are strictly append-only (no updates or deletes).
6. **Temporal Integrity & Immutability**: `createdAt`, `joinedAt`, `realizadoEm` must equal `request.time` on creation and remain immutable. `ownerId`, `rifaId`, `createdBy`, `actorUid`, `valor`, `indice` are immutable after creation.
7. **Secure List Queries**: Every `allow list` rule evaluates `resource.data` against `request.auth.uid` or `request.auth.token.email` without `get()`/`exists()` lookups inside `allow list`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Ghost Field on Rifa Create**: `{ ownerId: uid, titulo: "Rifa A", ..., isAdmin: true }` -> Rejected by `data.keys().hasOnly(...)`.
2. **Owner Spoofing on Rifa Create**: `{ ownerId: "other_uid", titulo: "Rifa B", ... }` -> Rejected by `data.ownerId == request.auth.uid`.
3. **Unverified Email Write**: Valid payload with `request.auth.token.email_verified == false` -> Rejected by `isVerifiedSignedIn()`.
4. **Cross-User PII Read on `/users/{otherUid}`**: `getDoc(/users/otherUid)` -> Rejected by `request.auth.uid == uid`.
5. **Path Variable ID Poisoning**: Creating `/rifas/invalid!id$1500chars...` -> Rejected by `isValidId(rifaId)`.
6. **Self-Promotion in `membros`**: Vendedor updating `membros/{uid}` to `{ role: "proprietario", permissions: { realizarSorteio: true } }` -> Rejected by Tiered Update rules.
7. **Uninvited Self-Join**: Creating `membros/{uid}` without a matching `pendente` invite matching `request.auth.token.email` -> Rejected by `exists()`/`get()` invite check.
8. **Mutating Archived Raffle**: Updating `titulo` on `rifas/{rifaId}` when `existing().status == 'arquivada'` -> Rejected by Terminal State Lock.
9. **Client-Forged Timestamp**: Creating `atribuicoes/{id}` with `createdAt: "2020-01-01T00:00:00Z"` -> Rejected by `incoming().createdAt == request.time`.
10. **Vendedor Overreach on Others' Numbers**: Vendedor without `confirmarLiberar` attempting to confirm/release a number where `existing().assignedBy != request.auth.uid` -> Rejected by role/ownership gate.
11. **Audit Trail Tampering**: Updating or deleting `sorteios/{id}` or `eventos/{id}` -> Rejected by `allow update, delete: if false;`.
12. **Blanket List Query Scraping**: Calling `getDocs(collection(db, 'rifas'))` without `where('ownerId', '==', uid)` -> Rejected by `allow list: if isVerifiedSignedIn() && resource.data.ownerId == request.auth.uid`.
