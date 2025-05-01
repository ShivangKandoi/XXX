-- Create tables for the calorie and weight tracking app

-- Create users table (handled by Supabase Auth)
-- We'll create a profile table to store additional user information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    height DECIMAL,
    target_weight DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add description columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'description') THEN
        ALTER TABLE exercises ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meals' AND column_name = 'description') THEN
        ALTER TABLE meals ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create exercises table if it doesn't exist
CREATE TABLE IF NOT EXISTS exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    calories_burnt INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create meals table if it doesn't exist
CREATE TABLE IF NOT EXISTS meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    calories INTEGER NOT NULL,
    protein DECIMAL,
    carbs DECIMAL,
    fat DECIMAL,
    date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create weights table if it doesn't exist
CREATE TABLE IF NOT EXISTS weights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    weight DECIMAL NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
    -- Enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
    ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE weights ENABLE ROW LEVEL SECURITY;

    -- Profiles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile"
            ON profiles FOR SELECT
            USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile"
            ON profiles FOR UPDATE
            USING (auth.uid() = id);
    END IF;

    -- Exercises policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Users can view their own exercises') THEN
        CREATE POLICY "Users can view their own exercises"
            ON exercises FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Users can insert their own exercises') THEN
        CREATE POLICY "Users can insert their own exercises"
            ON exercises FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Users can update their own exercises') THEN
        CREATE POLICY "Users can update their own exercises"
            ON exercises FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'Users can delete their own exercises') THEN
        CREATE POLICY "Users can delete their own exercises"
            ON exercises FOR DELETE
            USING (auth.uid() = user_id);
    END IF;

    -- Meals policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meals' AND policyname = 'Users can view their own meals') THEN
        CREATE POLICY "Users can view their own meals"
            ON meals FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meals' AND policyname = 'Users can insert their own meals') THEN
        CREATE POLICY "Users can insert their own meals"
            ON meals FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meals' AND policyname = 'Users can update their own meals') THEN
        CREATE POLICY "Users can update their own meals"
            ON meals FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meals' AND policyname = 'Users can delete their own meals') THEN
        CREATE POLICY "Users can delete their own meals"
            ON meals FOR DELETE
            USING (auth.uid() = user_id);
    END IF;

    -- Weights policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weights' AND policyname = 'Users can view their own weights') THEN
        CREATE POLICY "Users can view their own weights"
            ON weights FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weights' AND policyname = 'Users can insert their own weights') THEN
        CREATE POLICY "Users can insert their own weights"
            ON weights FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weights' AND policyname = 'Users can update their own weights') THEN
        CREATE POLICY "Users can update their own weights"
            ON weights FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weights' AND policyname = 'Users can delete their own weights') THEN
        CREATE POLICY "Users can delete their own weights"
            ON weights FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create or replace function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_exercises_updated_at') THEN
        CREATE TRIGGER update_exercises_updated_at
            BEFORE UPDATE ON exercises
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_meals_updated_at') THEN
        CREATE TRIGGER update_meals_updated_at
            BEFORE UPDATE ON meals
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_weights_updated_at') THEN
        CREATE TRIGGER update_weights_updated_at
            BEFORE UPDATE ON weights
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 