-- Run after 10_constraints.sql (see README). Lines marked "must fail" raise 23P01.
\set ON_ERROR_STOP 0
insert into calendar_feeds (id, name, url) values ('00000000-0000-0000-0000-000000000001', 'Booking.com', 'https://example.com/a.ics');
select replace_feed_ranges('00000000-0000-0000-0000-000000000001',
  '[{"start_date":"2027-07-01","end_date":"2027-07-05","reason":"Booking.com","external_uid":"x1"}]');
-- guest booking over an imported range must fail
insert into bookings (reference, access_token, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, total_cents, price_breakdown, status)
values ('AB-EEEEEE','t','2027-07-03','2027-07-06',2,'Five','e@x.com','1',3,100,'{}','pending');
-- adjacent booking must succeed
insert into bookings (reference, access_token, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, total_cents, price_breakdown, status)
values ('AB-FFFFFF','t','2027-07-05','2027-07-07',2,'Six','f@x.com','1',2,100,'{}','pending');
-- manual block over an active booking must fail
insert into blocked_ranges (start_date, end_date, source) values ('2027-07-06','2027-07-08','manual');
-- imported range over an active booking is accepted (it reflects a real external reservation)
select replace_feed_ranges('00000000-0000-0000-0000-000000000001',
  '[{"start_date":"2027-07-01","end_date":"2027-07-05","reason":"a","external_uid":"x1"},{"start_date":"2027-07-06","end_date":"2027-07-07","reason":"b","external_uid":"x2"}]');
select count(*) as feed_ranges from blocked_ranges where feed_id = '00000000-0000-0000-0000-000000000001';
-- changing a non-date field on that now-overlapped booking must still succeed
update bookings set admin_note = 'ok' where reference = 'AB-FFFFFF';
-- hold expiry appends to the note
insert into bookings (reference, access_token, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, total_cents, price_breakdown, status, hold_expires_at, admin_note)
values ('AB-GGGGGG','t','2027-08-01','2027-08-03',2,'Seven','g@x.com','1',2,100,'{}','awaiting_payment', now() - interval '1 minute', 'keep me');
select expire_stale_holds() as expired;
select status, admin_note from bookings where reference = 'AB-GGGGGG';
-- rate limit: 3 allowed, 4th refused
select hit_rate_limit('k', 3, 60), hit_rate_limit('k', 3, 60), hit_rate_limit('k', 3, 60), hit_rate_limit('k', 3, 60);
-- anon cannot call the functions
set role anon;
select hit_rate_limit('k', 3, 60);
reset role;
