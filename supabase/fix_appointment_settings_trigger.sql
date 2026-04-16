-- Fix the trigger function for appointment_settings table
-- Drop the old trigger if it exists
drop trigger if exists appointment_settings_updated_at_trigger on appointment_settings;

-- Create a proper trigger function for updating timestamps
create or replace function update_appointment_settings_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create the trigger
create trigger appointment_settings_updated_at_trigger before
update on appointment_settings for each row
execute function update_appointment_settings_timestamp();
