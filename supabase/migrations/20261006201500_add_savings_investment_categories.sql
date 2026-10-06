-- Default categories for savings and investments. The partial conflict target
-- keeps this safe to run in databases that already have these global defaults.
INSERT INTO public.categories (user_id, name, type, is_default, icon, color) VALUES
  (NULL, 'Guardar dinheiro', 'expense', true, 'PiggyBank', '#0F766E'),
  (NULL, 'Investimentos', 'expense', true, 'ChartNoAxesCombined', '#7C3AED'),
  (NULL, 'Resgatar dinheiro', 'income', true, 'HandCoins', '#16A34A')
ON CONFLICT (name, type) WHERE user_id IS NULL DO UPDATE
SET
  is_default = EXCLUDED.is_default,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;
