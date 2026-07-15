-- Allows a note to exist without a category, powering the new "General
-- Notes" section (notes not tied to any client/category).
alter table notes alter column list_id drop not null;
