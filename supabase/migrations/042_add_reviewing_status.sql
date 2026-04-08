-- Add "reviewing" status for tasks awaiting client confirmation
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'reviewing';
