-- Rename existing users table to customer
ALTER TABLE public.users RENAME TO customer;

-- Create new users table
CREATE TABLE public.users(
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fisrt_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  username VARCHAR(255),
  user_password VARCHAR(255)
);
