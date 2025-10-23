const supabase = require('../supabase');

class PostService {
  // Create a new post
  static async create(postData) {
    const { title, summary, content, cover_image_url, user_id } = postData;
    
    const { data, error } = await supabase
      .from('posts')
      .insert([{
        title,
        summary,
        content,
        cover_image_url,
        user_id
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

  // Get all posts with pagination
  static async getAll(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          user_id,
          username,
          name
        )
      `)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Get post by ID
  static async findById(postId) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          user_id,
          username,
          name
        )
      `)
      .eq('post_id', postId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    return data;
  }

  // Update post
  static async update(postId, updateData) {
    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('post_id', postId)
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

  // Delete post
  static async delete(postId) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('post_id', postId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  // Get posts by user
  static async getByUserId(userId, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          user_id,
          username,
          name
        )
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Check if user is author of post
  static async isAuthor(postId, userId) {
    const { data, error } = await supabase
      .from('posts')
      .select('user_id')
      .eq('post_id', postId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data.user_id === userId;
  }
}

module.exports = PostService;