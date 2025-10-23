const supabase = require('../supabase');

class CommentService {
  // Create a new comment
  static async create(commentData) {
    const { post_id, user_id, content } = commentData;
    
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        post_id,
        user_id,
        content
      }])
      .select(`
        *,
        users (
          user_id,
          username,
          name
        )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Get all comments for a post
  static async getByPostId(postId) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users (
          user_id,
          username,
          name
        )
      `)
      .eq('post_id', postId)
      .order('timestamp', { ascending: true }); // Oldest first

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Get comment by ID
  static async findById(commentId) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users (
          user_id,
          username,
          name
        )
      `)
      .eq('comment_id', commentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    return data;
  }

  // Delete a comment
  static async delete(commentId) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('comment_id', commentId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  // Check if user is author of comment
  static async isAuthor(commentId, userId) {
    const { data, error } = await supabase
      .from('comments')
      .select('user_id')
      .eq('comment_id', commentId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data.user_id === userId;
  }
}

module.exports = CommentService;
