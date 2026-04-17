-- Create appointment_settings table
create table public.appointment_settings (
  id uuid not null default gen_random_uuid(),
  business_id text not null,
  default_duration integer not null default 60,
  buffer_time integer not null default 15,
  max_daily_appointments integer not null default 20,
  cancellation_notice integer not null default 24,
  enable_reschedule boolean not null default true,
  enable_auto_reminder boolean not null default true,
  working_hours_start text not null default '09:00',
  working_hours_end text not null default '18:00',
  lunch_break_start text not null default '12:00',
  lunch_break_end text not null default '13:00',
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint appointment_settings_pkey primary key (id),
  constraint appointment_settings_business_id_key unique (business_id)
) tablespace pg_default;

-- Create trigger to update updated_at timestamp
create trigger appointment_settings_updated_at_trigger before
update on appointment_settings for each row
execute function update_business_settings_timestamp ();

-- Create index for faster queries
create index appointment_settings_business_id_idx on appointment_settings (business_id);

-- Enable Row Level Security (optional - for multi-tenancy)
alter table appointment_settings enable row level security;
