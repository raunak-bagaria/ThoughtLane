const supabase = require('../supabase');

class LikeService {
  // Toggle like on a post
  async togglePostLike(postId, userId) {
    // Check if like exists
    const { data: existingLikes, error: checkError } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .is('comment_id', null);

    // Don't throw error if no results found
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

    if (existingLike) {
      // Unlike - delete the like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .is('comment_id', null);

      if (error) throw error;
      return { liked: false };
    } else {
      // Like - insert new like
      const { data, error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: userId,
          comment_id: null
        })
        .select()
        .single();

      if (error) throw error;
      return { liked: true, data };
    }
  }

  // Toggle like on a comment
  async toggleCommentLike(commentId, userId) {
    // Check if like exists
    const { data: existingLikes, error: checkError } = await supabase
      .from('likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    // Don't throw error if no results found
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

    if (existingLike) {
      // Unlike - delete the like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      if (error) throw error;
      return { liked: false };
    } else {
      // Like - insert new like
      const { data, error } = await supabase
        .from('likes')
        .insert({
          comment_id: commentId,
          user_id: userId,
          post_id: null
        })
        .select()
        .single();

      if (error) throw error;
      return { liked: true, data };
    }
  }

  // Get like count for a post
  async getPostLikeCount(postId) {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .is('comment_id', null);

    if (error) throw error;
    return count || 0;
  }

  // Get like count for a comment
  async getCommentLikeCount(commentId) {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    if (error) throw error;
    return count || 0;
  }

  // Check if user has liked a post
  async hasUserLikedPost(postId, userId) {
    if (!userId) return false;

    const { data, error } = await supabase
      .from('likes')
      .select('like_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .is('comment_id', null);

    // Don't throw error if no results found
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data && data.length > 0;
  }

  // Check if user has liked a comment
  async hasUserLikedComment(commentId, userId) {
    if (!userId) return false;

    const { data, error } = await supabase
      .from('likes')
      .select('like_id')
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    // Don't throw error if no results found
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data && data.length > 0;
  }

  // Get like counts for multiple posts (for listing pages)
  async getPostLikeCounts(postIds) {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .in('post_id', postIds)
      .is('comment_id', null);

    if (error) throw error;

    // Count likes per post
    const counts = {};
    postIds.forEach(id => counts[id] = 0);
    data.forEach(like => {
      if (like.post_id) {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1;
      }
    });

    return counts;
  }

  // Get user's likes for multiple posts (for listing pages)
  async getUserPostLikes(postIds, userId) {
    if (!userId) return {};

    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .in('post_id', postIds)
      .eq('user_id', userId)
      .is('comment_id', null);

    if (error) throw error;

    // Convert to object for easy lookup
    const likes = {};
    data.forEach(like => {
      if (like.post_id) {
        likes[like.post_id] = true;
      }
    });

    return likes;
  }
}

module.exports = new LikeService();