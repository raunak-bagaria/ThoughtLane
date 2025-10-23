const supabase = require('../supabase');

class UserService {
  // Create a new user (register)
  static async create(userData) {
    const { username, password } = userData;
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username,
        password,
        name: username.split('@')[0] // Use username prefix as name
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Find user by username
  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(error.message);
    }

    return data;
  }

  // Find user by ID
  static async findById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    return data;
  }

  // Update user
  static async update(userId, updateData) {
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Delete user
  static async delete(userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }
}

module.exports = UserService;