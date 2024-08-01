UPDATE sfa.person SET previous_last_name = null, sin = '111222333', email='fake-email@yukon.ca', birth_date ='2000-01-01', telephone = '111-222-3333';

UPDATE sfa.person_address SET email='fake-email@yukon.ca', address1 = 'Fake Address 1', address2 = 'Fake Address 2', telephone = '111-222-3333';

update sfa.student SET kin_first_name = 'FakeFirst', kin_last_name = 'FakeLast', kin_address1 = 'Fake Address 1', kin_address2 = 'Fake Address 2';

update sfa.application set school_email ='fake-email@yukon.ca', school_telephone = '112-222-3333';

update.sfa.communication_log set sent_from_email = 'fake-email@yukon.ca', sent_to_email = 'fake-email@yukon.ca', sent_to_cc = 'fake-email@yukon.ca';

update sfa.csl_restricted set first_name = 'FakeFirst', last_name = 'FakeLast', sin = '111222333', birth_date = '2000-01-01';

update sfa.csl_nslsc_address set address_line_1 = 'Fake Address 1', address_line_2 = 'Fake Address 2', phone_number = '111-222-3333', [name] = 'Fake Name';

update sfa.csl_nars_history set birth_date = '2000-01-01', parent1_sin = '111222333', parent2_sin = '111222333', sin = '111222333', spouse_sin = '111222333';

update sfa.parent_dependent set first_name = 'FakeFirst', last_name = 'FakeLast', birth_date = '2000-01-01';

update sfa.dependent set first_name = 'FakeFirst', last_name = 'FakeLast', birth_date = '2000-01-01';

update sfa.yea set first_name = 'FakeFirst', last_name = 'FakeLast', birth_date = '2000-01-01';

update sfa.yea_update set first_name = 'FakeFirst', last_name = 'FakeLast', birth_date = '2000-01-01';

update sfa.msfaa_import set sin = '111222333';

update sfa.msfaa_email_log set email = 'fake-email@yukon.ca';

update sfa.ecert_import set sin = '111222333';

update sfa.vendor_update set email = 'fake-email@yukon.ca', address = 'Fake Address', telephone = '111-222-3333'

update sfa.residence set address = 'Fake Address';
