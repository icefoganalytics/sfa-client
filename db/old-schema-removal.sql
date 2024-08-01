
select concat('DROP INDEX IF EXISTS ssma_oracle.', name),* from sys.all_objects
where schema_id = 7 
  and type = 'D'

select concat('DROP PROCEDURE IF EXISTS ssma_oracle.', name) from sys.all_objects
where schema_id = 7 
  and type = 'P'

select concat('DROP FUNCTION IF EXISTS ssma_oracle.', name) from sys.all_objects
where schema_id = 7 
  and type = 'FN'

select concat('DROP VIEW IF EXISTS ssma_oracle.', name),* from sys.all_objects
where schema_id = 7 
  and type = 'V'

select concat('DROP FUNCTION IF EXISTS ssma_oracle.', name) from sys.all_objects
where schema_id = 7 
  and type = 'IF'

select concat('DROP INDEX IF EXISTS ssma_oracle.', name) from sys.all_objects
where schema_id = 7 
  and type = 'D'

select concat('DROP FUNCTION IF EXISTS ssma_oracle.', name) from sys.all_objects
where schema_id = 7 
  and type = 'FN'
  
drop schema ssma_oracle

select concat('DROP FUNCTION IF EXISTS sfaadmin.', name) from sys.all_objects
where schema_id = 5 
  and type = 'FN'
order by name

select concat('DROP INDEX IF EXISTS sfaadmin.', name) from sys.all_objects
where schema_id = 5
  and type = 'D'

select concat('DROP PROCEDURE IF EXISTS sfaadmin.', name) from sys.all_objects
where schema_id = 5
  and type = 'P'

select concat('DROP INDEX IF EXISTS sfaadmin.', name) from sys.all_objects
where schema_id = 5
  and type = 'F'

select concat('DROP VIEW IF EXISTS sfaadmin.', name) from sys.all_objects
where schema_id = 5
  and type = 'V'

select concat('DROP TABLE IF EXISTS sfaadmin.', name) from sys.all_objects
where schema_id = 5
  and type = 'U'
  
select concat('DROP SEQUENCE IF EXISTS sfaadmin.', name) from sys.all_objects
where schema_id = 5
  and type = 'SO'
  
drop schema sfaadmin