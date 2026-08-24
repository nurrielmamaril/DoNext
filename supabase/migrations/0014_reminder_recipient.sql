-- Reminders previously always went to the account owner's own email, looked up
-- from profiles. This lets a reminder be addressed to someone else instead.
-- Null keeps the existing behaviour ("send it to me"), so every row already in
-- the table carries on working untouched.
alter table reminders add column recipient_email text;
