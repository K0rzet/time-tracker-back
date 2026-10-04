# time-tracker-back
## Card ordering

Authenticated `PUT /ordering/projects`, `PUT /ordering/categories`, and
`PUT /ordering/timers/:projectId` accept `{ "ids": ["uuid", "..."] }`.
Only cards owned by the current user can be reordered. Timer ordering is scoped
to one owned project. Subsets reorder their existing slots, preserving hidden
cards. Updates are transactional and serialized per collection; they do not
modify timer timestamps or tracked time. Newly created cards follow saved cards.

Before deploying the updated backend to an existing database, take a backup and
apply the additive SQL change (this repository has no Prisma migration baseline):

```sh
npx prisma db execute --file prisma/changes/20261004_card_order.sql --schema prisma/schema.prisma
npx prisma generate
npm run build
pm2 restart tracker
```

The SQL change is idempotent and adds only three defaulted integer columns.
`npm test -- --runInBand` includes ordering and request-validation tests.
