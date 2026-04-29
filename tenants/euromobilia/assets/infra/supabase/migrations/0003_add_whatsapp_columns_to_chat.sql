-- ============================================================
-- Migration: Add WhatsApp-aware columns to legacy chat tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add missing columns to chat_sessions (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='phone_number') THEN
    ALTER TABLE chat_sessions ADD COLUMN phone_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='conversation_id') THEN
    ALTER TABLE chat_sessions ADD COLUMN conversation_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='contact_name') THEN
    ALTER TABLE chat_sessions ADD COLUMN contact_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='intake_progress') THEN
    ALTER TABLE chat_sessions ADD COLUMN intake_progress JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='cart') THEN
    ALTER TABLE chat_sessions ADD COLUMN cart JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='handoff_state') THEN
    ALTER TABLE chat_sessions ADD COLUMN handoff_state TEXT DEFAULT 'auto';
  END IF;
END $$;

-- Add missing columns to chat_messages (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='metadata') THEN
    ALTER TABLE chat_messages ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Create unique constraint on phone_number + conversation_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_chat_sessions_phone_conversation'
  ) THEN
    CREATE UNIQUE INDEX idx_chat_sessions_phone_conversation 
    ON chat_sessions(phone_number, conversation_id) 
    WHERE phone_number IS NOT NULL AND conversation_id IS NOT NULL;
  END IF;
END $$;

-- Update existing rows to have default JSONB values
UPDATE chat_sessions SET intake_progress = '{}' WHERE intake_progress IS NULL;
UPDATE chat_sessions SET cart = '[]' WHERE cart IS NULL;
UPDATE chat_sessions SET handoff_state = 'auto' WHERE handoff_state IS NULL;
UPDATE chat_messages SET metadata = '{}' WHERE metadata IS NULL;

-- Add index for fast session lookup by phone/conversation
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lookup ON chat_sessions(phone_number, conversation_id);
