# Database checks

Verifies the migration on a plain local PostgreSQL 16 (no Supabase needed):

```bash
createdb ab_test
psql -d ab_test -f supabase/tests/00_supabase_stub.sql      # stand-ins for Supabase roles/storage
psql -d ab_test -f supabase/migrations/0001_initial_schema.sql
psql -d ab_test -f supabase/seed.sql
psql -d ab_test -f supabase/tests/10_constraints.sql
```

Expected in `10_constraints.sql`: the two lines marked "must fail" raise
`conflicting key value violates exclusion constraint "bookings_no_overlap"`, the `anon` role gets
`permission denied`, and the final list shows the media order reversed.
