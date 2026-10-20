\set ON_ERROR_STOP 0
insert into bookings (reference, access_token, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, total_cents, price_breakdown, status)
values ('AB-AAAAAA','t','2027-05-10','2027-05-14',2,'One','a@x.com','1',4,100,'{}','confirmed');
-- overlapping active booking must fail (23P01)
insert into bookings (reference, access_token, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, total_cents, price_breakdown, status)
values ('AB-BBBBBB','t','2027-05-12','2027-05-15',2,'Two','b@x.com','1',3,100,'{}','pending');
-- same-day turnover must succeed
insert into bookings (reference, access_token, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, total_cents, price_breakdown, status)
values ('AB-CCCCCC','t','2027-05-14','2027-05-16',2,'Three','c@x.com','1',2,100,'{}','pending');
-- overlapping cancelled booking must succeed
insert into bookings (reference, access_token, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, total_cents, price_breakdown, status)
values ('AB-DDDDDD','t','2027-05-11','2027-05-13',2,'Four','d@x.com','1',2,100,'{}','cancelled');
-- reactivating the cancelled one must fail
update bookings set status='confirmed' where reference='AB-DDDDDD';
select reference, status from bookings order by reference;
-- anon has no access (RLS deny-by-default)
set role anon;
select count(*) as anon_visible from bookings;
reset role;
-- reorder_media
select reorder_media(array(select id from media order by sort_order desc));
select string_agg(url, ',' order by sort_order) from media;
