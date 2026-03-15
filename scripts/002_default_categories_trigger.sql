-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default expense categories
  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    (NEW.id, 'Food & Dining', 'expense', '#ef4444', 'utensils'),
    (NEW.id, 'Transportation', 'expense', '#f97316', 'car'),
    (NEW.id, 'Shopping', 'expense', '#eab308', 'shopping-bag'),
    (NEW.id, 'Entertainment', 'expense', '#22c55e', 'film'),
    (NEW.id, 'Bills & Utilities', 'expense', '#3b82f6', 'receipt'),
    (NEW.id, 'Healthcare', 'expense', '#ec4899', 'heart-pulse'),
    (NEW.id, 'Housing', 'expense', '#8b5cf6', 'home'),
    (NEW.id, 'Education', 'expense', '#06b6d4', 'graduation-cap'),
    (NEW.id, 'Personal', 'expense', '#64748b', 'user'),
    (NEW.id, 'Other', 'expense', '#94a3b8', 'ellipsis');
  
  -- Insert default income categories
  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    (NEW.id, 'Salary', 'income', '#22c55e', 'briefcase'),
    (NEW.id, 'Freelance', 'income', '#3b82f6', 'laptop'),
    (NEW.id, 'Investments', 'income', '#8b5cf6', 'trending-up'),
    (NEW.id, 'Refunds', 'income', '#f97316', 'rotate-ccw'),
    (NEW.id, 'Other Income', 'income', '#64748b', 'plus-circle');
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_categories ON auth.users;

-- Create trigger to run when new user signs up
CREATE TRIGGER on_auth_user_created_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_categories();
