-- USER TABLE
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- POST TABLE
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- COMMENT TABLE
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- MEDIA TABLE
CREATE TABLE media (
    media_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    url TEXT NOT NULL
);

-- TAG TABLE
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- LIKE TABLE
CREATE TABLE likes (
    like_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE,
    CONSTRAINT like_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Create access policy for media storage bucket
CREATE POLICY "Access To Media Bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ThoughtLane_Media' );

-- Trigger 1: Activity logging trigger
-- Create activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Function for logging activities
CREATE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (user_id, action_type, table_name, record_id)
        VALUES (NEW.user_id, 'INSERT', TG_TABLE_NAME, NEW.post_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_log (user_id, action_type, table_name, record_id)
        VALUES (NEW.user_id, 'UPDATE', TG_TABLE_NAME, NEW.post_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (user_id, action_type, table_name, record_id)
        VALUES (OLD.user_id, 'DELETE', TG_TABLE_NAME, OLD.post_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_post_activity
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();


-- Trigger 2: Prevent deletion of posts with many comments
CREATE FUNCTION prevent_popular_post_deletion()
RETURNS TRIGGER AS $$
DECLARE
    comment_count INTEGER;
BEGIN
    -- Count comments for the post being deleted
    SELECT COUNT(*) INTO comment_count
    FROM comments
    WHERE post_id = OLD.post_id;
    
    -- Prevent deletion if post has more than 10 comments
    IF comment_count > 10 THEN
        RAISE EXCEPTION 'Cannot delete post with more than 10 comments. Archive it instead.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_popular_deletion
    BEFORE DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_popular_post_deletion();

-- Procedure to archive old posts (move to archive table)
CREATE TABLE IF NOT EXISTS archived_posts (
    LIKE posts INCLUDING ALL
);

CREATE PROCEDURE archive_old_posts(days_old INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Insert old posts into archive
    INSERT INTO archived_posts
    SELECT * FROM posts
    WHERE timestamp < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived posts from main table
    DELETE FROM posts
    WHERE timestamp < NOW() - (days_old || ' days')::INTERVAL;
    
    RAISE NOTICE 'Archived % posts older than % days', archived_count, days_old;
END;
$$;

-- Function 1: Get comprehensive post statistics
CREATE OR REPLACE FUNCTION get_post_statistics(p_post_id INTEGER)
RETURNS TABLE(
    post_id INTEGER,
    title VARCHAR,
    author_name VARCHAR,
    like_count BIGINT,
    comment_count BIGINT,
    view_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id,
        p.title,
        u.username,
        COUNT(DISTINCT l.like_id) AS like_count,
        COUNT(DISTINCT c.comment_id) AS comment_count,
        0 AS view_count
    FROM posts p
    JOIN users u ON p.user_id = u.user_id
    LEFT JOIN likes l ON p.post_id = l.post_id
    LEFT JOIN comments c ON p.post_id = c.post_id
    WHERE p.post_id = p_post_id
    GROUP BY p.post_id, p.title, u.username;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get trending posts (most liked in last N days)
CREATE FUNCTION get_trending_posts(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    post_id INTEGER,
    title VARCHAR,
    author VARCHAR,
    like_count BIGINT,
    comment_count BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id,
        p.title,
        u.username AS author,
        COUNT(DISTINCT l.like_id) AS like_count,
        COUNT(DISTINCT c.comment_id) AS comment_count,
        p.timestamp AS created_at
    FROM posts p
    JOIN users u ON p.user_id = u.user_id
    LEFT JOIN likes l ON p.post_id = l.post_id
    LEFT JOIN comments c ON p.post_id = c.post_id
    WHERE p.timestamp > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY p.post_id, p.title, u.username, p.timestamp
    ORDER BY like_count DESC, comment_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Nested Query 1: Users who have posted more than the average
SELECT 
    u.user_id,
    u.username,
    COUNT(p.post_id) AS post_count
FROM users u
JOIN posts p ON u.user_id = p.user_id
GROUP BY u.user_id, u.username
HAVING COUNT(p.post_id) > (
    SELECT AVG(post_count)
    FROM (
        SELECT COUNT(*) AS post_count
        FROM posts
        GROUP BY user_id
    ) AS user_posts
);


-- Nested Query 2: Posts with above-average likes
SELECT 
    p.post_id,
    p.title,
    u.username AS author,
    COUNT(l.like_id) AS like_count
FROM posts p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN likes l ON p.post_id = l.post_id
GROUP BY p.post_id, p.title, u.username
HAVING COUNT(l.like_id) > (
    SELECT AVG(like_count)
    FROM (
        SELECT COUNT(*) AS like_count
        FROM likes
        WHERE post_id IS NOT NULL
        GROUP BY post_id
    ) AS post_likes
);

-- Nested Query 3: Tags used in highly-liked posts
SELECT 
    t.name AS tag_name,
    COUNT(DISTINCT t.post_id) AS usage_count,
    AVG(like_counts.like_count) AS avg_likes
FROM tags t
JOIN (
    SELECT 
        p.post_id,
        COUNT(l.like_id) AS like_count
    FROM posts p
    LEFT JOIN likes l ON p.post_id = l.post_id
    GROUP BY p.post_id
) AS like_counts ON t.post_id = like_counts.post_id
WHERE like_counts.like_count > (
    SELECT AVG(like_count)
    FROM (
        SELECT COUNT(*) AS like_count
        FROM likes
        WHERE post_id IS NOT NULL
        GROUP BY post_id
    ) AS avg_post_likes
)
GROUP BY t.name
ORDER BY usage_count DESC;

-- Join Query 1: Complete post information with author, tags, and stats
SELECT 
    p.post_id,
    p.title,
    p.summary,
    u.username AS author,
    u.user_id AS author_id,
    p.timestamp AS created_at,
    STRING_AGG(DISTINCT t.name, ', ') AS tags,
    COUNT(DISTINCT l.like_id) AS like_count,
    COUNT(DISTINCT c.comment_id) AS comment_count
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
LEFT JOIN tags t ON p.post_id = t.post_id
LEFT JOIN likes l ON p.post_id = l.post_id
LEFT JOIN comments c ON p.post_id = c.post_id
GROUP BY p.post_id, p.title, p.summary, u.username, u.user_id, p.timestamp
ORDER BY p.timestamp DESC;

-- Join Query 2: User activity report (posts, comments, likes given and received)
SELECT 
    u.user_id,
    u.username,
    COUNT(DISTINCT p.post_id) AS posts_created,
    COUNT(DISTINCT c.comment_id) AS comments_made,
    COUNT(DISTINCT l_given.like_id) AS likes_given,
    COUNT(DISTINCT l_received.like_id) AS likes_received_on_posts
FROM users u
LEFT JOIN posts p ON u.user_id = p.user_id
LEFT JOIN comments c ON u.user_id = c.user_id
LEFT JOIN likes l_given ON u.user_id = l_given.user_id
LEFT JOIN likes l_received ON p.post_id = l_received.post_id
GROUP BY u.user_id, u.username
ORDER BY posts_created DESC, comments_made DESC;

-- Aggregate Query 1: Post count per user with engagement metrics
SELECT 
    u.user_id,
    u.username,
    COUNT(DISTINCT p.post_id) AS total_posts,
    SUM(CASE WHEN l.like_id IS NOT NULL THEN 1 ELSE 0 END) AS total_likes_received,
    AVG(CASE WHEN l.like_id IS NOT NULL THEN 1 ELSE 0 END) AS avg_likes_per_post,
    MAX(p.timestamp) AS latest_post_date,
    MIN(p.timestamp) AS first_post_date
FROM users u
LEFT JOIN posts p ON u.user_id = p.user_id
LEFT JOIN likes l ON p.post_id = l.post_id
GROUP BY u.user_id, u.username
HAVING COUNT(DISTINCT p.post_id) > 0
ORDER BY total_posts DESC;

-- Aggregate Query 2: Comment statistics by post
SELECT 
    p.post_id,
    p.title,
    COUNT(c.comment_id) AS comment_count,
    MIN(c.timestamp) AS first_comment,
    MAX(c.timestamp) AS latest_comment,
    COUNT(DISTINCT c.user_id) AS unique_commenters
FROM posts p
LEFT JOIN comments c ON p.post_id = c.post_id
GROUP BY p.post_id, p.title
HAVING COUNT(c.comment_id) > 0
ORDER BY comment_count DESC;

-- View to simplify common post queries
CREATE VIEW post_summary AS
SELECT 
    p.post_id,
    p.title,
    p.summary,
    u.username AS author,
    p.timestamp AS created_at,
    COUNT(DISTINCT l.like_id) AS likes,
    COUNT(DISTINCT c.comment_id) AS comments,
    STRING_AGG(DISTINCT t.name, ', ') AS tags
FROM posts p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN likes l ON p.post_id = l.post_id
LEFT JOIN comments c ON p.post_id = c.post_id
LEFT JOIN tags t ON p.post_id = t.post_id
GROUP BY p.post_id, p.title, p.summary, u.username, p.timestamp;

-- Query to use the view
SELECT * FROM post_summary
WHERE likes > 2
ORDER BY created_at DESC;