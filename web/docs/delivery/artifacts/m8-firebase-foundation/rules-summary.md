# Firebase Security Rules Summary (Phase 1)

## Firestore Rules (`firestore.rules`)

| Collection | Action | Condition |
|------------|--------|-----------|
| `*` (All) | read/write | **Deny** (Default) |
| `bookingDrafts/{id}` | create/update | Allow if size < 5KB |
| `bookingDrafts/{id}` | get | Allow (Public lookup by ID) |

> [!NOTE]
> Rules will be tightened in Milestone 9 to require authentication and ownership for draft management.

## Storage Rules (`storage.rules`)

| Path | Action | Condition |
|------|--------|-----------|
| `*` (All) | read/write | **Deny** (Default) |
| `/booking-uploads/{draftId}/{file}` | write | Size < 10MB, Type is image/pdf |
| `/booking-uploads/{draftId}/{file}` | read | **Deny** (Restricted to server-side/admin in Phase 1) |

> [!WARNING]
> Public read access is currently disabled. Final validation and access patterns will be implemented during the booking flow expansion.
