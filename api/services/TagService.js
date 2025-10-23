const supabase = require('../supabase');

class TagService {
  // Get all unique tags
  static async getAll() {
    const { data, error } = await supabase
      .from('tags')
      .select('tag_id, name, post_id')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Get unique tag names with their first tag_id
    const uniqueTags = {};
    data.forEach(tag => {
      if (!uniqueTags[tag.name]) {
        uniqueTags[tag.name] = {
          name: tag.name,
          tag_id: tag.tag_id
        };
      }
    });

    return Object.values(uniqueTags);
  }

  // Get tags for a specific post
  static async getByPostId(postId) {
    const { data, error } = await supabase
      .from('tags')
      .select('tag_id, name')
      .eq('post_id', postId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Add tags to a post (multiple tags)
  static async addTagsToPost(postId, tagNames) {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    // Create tag entries for the post
    const tagEntries = tagNames.map(name => ({
      post_id: postId,
      name: name.trim()
    }));

    const { data, error } = await supabase
      .from('tags')
      .insert(tagEntries)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Remove all tags from a post
  static async removeTagsFromPost(postId) {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('post_id', postId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  // Get posts by tag name
  static async getPostsByTag(tagName, limit = 5, offset = 0) {
    // First get all post_ids that have this tag
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .select('post_id')
      .eq('name', tagName);

    if (tagError) {
      throw new Error(tagError.message);
    }

    if (!tagData || tagData.length === 0) {
      return [];
    }

    // Get unique post IDs
    const postIds = [...new Set(tagData.map(t => t.post_id))];

    // Fetch the posts with user information
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          user_id,
          username,
          name
        )
      `)
      .in('post_id', postIds)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      throw new Error(postsError.message);
    }

    return posts;
  }

  // Update tags for a post (replace all existing tags)
  static async updatePostTags(postId, tagNames) {
    // Remove existing tags
    await this.removeTagsFromPost(postId);
    
    // Add new tags
    if (tagNames && tagNames.length > 0) {
      return await this.addTagsToPost(postId, tagNames);
    }
    
    return [];
  }
}

module.exports = TagService;