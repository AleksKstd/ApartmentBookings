# Database checks

Verifies the migration on a plain local PostgreSQL 16 (no Supabase needed):

```bash
createdb ab_test
psql -d ab_test -f supabase/tests/00_supabase_stub.sql      # stand-ins for Supabase roles/storage
for f in supabase/migrations/*.sql; do psql -d ab_test -f "$f"; done
psql -d ab_test -f supabase/tests/10_constraints.sql
psql -d ab_test -f supabase/tests/20_calendar_integrity.sql
```

Expected in `10_constraints.sql`: the two lines marked "must fail" raise
`conflicting key value violates exclusion constraint "bookings_no_overlap"`, the `anon` role gets
`permission denied`, and the final list shows the media order reversed.

Expected in `20_calendar_integrity.sql`: the booking over an imported Booking.com range and the
manual block over an active booking raise `dates overlap a blocked range` /
`blocked range overlaps an active booking`; the expired hold keeps its earlier note; the fourth
`hit_rate_limit` call returns `f`; and `anon` gets `permission denied for function hit_rate_limit`.
