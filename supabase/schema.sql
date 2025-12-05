-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create rooms table
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  host_id UUID REFERENCES auth.users(id) NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('liar', 'mafia')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Room hosts can update their rooms"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Room hosts can delete their rooms"
  ON rooms FOR DELETE
  USING (auth.uid() = host_id);

-- Create room_players table
CREATE TABLE room_players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(room_id, user_id)
);

ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Room players policies
CREATE POLICY "Room players are viewable by everyone"
  ON room_players FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join rooms"
  ON room_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own player status"
  ON room_players FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON room_players FOR DELETE
  USING (auth.uid() = user_id);

-- Create game_sessions table
CREATE TABLE game_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL,
  game_state JSONB DEFAULT '{}'::jsonb,
  current_phase TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Game sessions policies
CREATE POLICY "Game sessions are viewable by room players"
  ON game_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = game_sessions.room_id
      AND room_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Room hosts can create game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = game_sessions.room_id
      AND rooms.host_id = auth.uid()
    )
  );

CREATE POLICY "Room hosts can update game sessions"
  ON game_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = game_sessions.room_id
      AND rooms.host_id = auth.uid()
    )
  );

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nickname', 'User' || SUBSTRING(new.id::text, 1, 8)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;

