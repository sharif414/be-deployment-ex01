DROP TABLE IF EXISTS public.users;

CREATE TABLE public.users(
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  username VARCHAR(255),
  user_password VARCHAR(255)
);
