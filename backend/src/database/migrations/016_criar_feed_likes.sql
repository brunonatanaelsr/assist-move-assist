-- Tabela de curtidas por usuário em posts do feed
CREATE TABLE IF NOT EXISTS feed_likes (
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_likes_post ON feed_likes(post_id);

