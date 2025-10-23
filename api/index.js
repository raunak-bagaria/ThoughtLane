// Load environment variables from parent directory
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const UserService = require('./services/UserService')
const PostService = require('./services/PostService')
const StorageService = require('./services/StorageService')
const TagService = require('./services/TagService')
const CommentService = require('./services/CommentService')
const LikeService = require('./services/LikeService')
const supabase = require('./supabase')
const bcrypt = require('bcryptjs')
const app = express()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs')

const salt = bcrypt.genSaltSync(10)
const secret = process.env.JWT_SECRET || 'asdfe45we45w345wegw345werjktjwertkj'
const PORT = process.env.BACKEND_PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000'

app.use(cors({credentials:true,origin: FRONTEND_URL}))
app.use(express.json())
app.use(cookieParser())
// Keep this for backward compatibility with old local uploads
app.use('/uploads', express.static(__dirname + '/uploads'))

app.post('/register', async (req,res) => {
  const {username,password} = req.body
  try {
    const userDoc = await UserService.create({
      username: username,
      password: bcrypt.hashSync(password,salt),
    })
    res.json({
      user_id: userDoc.user_id,
      username: userDoc.username,
      name: userDoc.name
    })
  } catch(e) {
    console.log(e)
    res.status(400).json({error: e.message})
  }
})

app.post('/login', async (req,res) => {
  const {username,password} = req.body
  try {
    const userDoc = await UserService.findByUsername(username)

    if (!userDoc) {
      return res.status(400).json({ error: 'User does not exist' });
    }

    const passOk = bcrypt.compareSync(password, userDoc.password)
    if (passOk) {
      jwt.sign({username: userDoc.username, id: userDoc.user_id}, secret, {}, (err,token) => {
        if (err) throw err
        res.cookie('token', token).json({
          id: userDoc.user_id,
          username: userDoc.username
        })
      })
    } else {
      res.status(400).json({ error: 'Wrong credentials' });
    }
  } catch(e) {
    console.log(e)
    res.status(500).json({ error: 'Server error' });
  }
})

app.get('/profile', (req,res) => {
  const {token} = req.cookies
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }
  jwt.verify(token, secret, {}, (err,info) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    res.json(info)
  })
})

app.post('/logout', (req,res) => {
  res.cookie('token', '').json('ok')
})

// Upload content images (for rich text editor)
app.post('/upload-content-image', uploadMiddleware.single('file'), async (req, res) => {
  try {
    const {token} = req.cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      try {
        // Upload to Supabase Storage
        const imageUrl = await StorageService.uploadFile(req.file);
        res.json({ url: imageUrl });
      } catch (uploadError) {
        console.error('Error uploading content image:', uploadError);
        res.status(500).json({ error: 'Failed to upload image' });
      }
    });
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  try {
    let cover_image_url = null;
    
    // Upload to Supabase Storage instead of local storage
    if (req.file) {
      cover_image_url = await StorageService.uploadFile(req.file);
    }

    const {token} = req.cookies
    jwt.verify(token, secret, {}, async (err,info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' })
      
      const {title,summary,content} = req.body
      const postDoc = await PostService.create({
        title,
        summary,
        content,
        cover_image_url,
        user_id: info.id,
      })
      
      // Handle tags if provided
      if (req.body.tags) {
        try {
          const tags = JSON.parse(req.body.tags);
          if (Array.isArray(tags) && tags.length > 0) {
            await TagService.addTagsToPost(postDoc.post_id, tags);
          }
        } catch (e) {
          console.log('Error parsing tags:', e);
        }
      }
      
      res.json(postDoc)
    })
  } catch(e) {
    console.log(e)
    res.status(400).json({ error: 'Failed to create post' })
  }
})

app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  try {
    let cover_image_url = null
    
    // Upload to Supabase Storage if new file provided
    if (req.file) {
      cover_image_url = await StorageService.uploadFile(req.file);
    }

    const {token} = req.cookies
    jwt.verify(token, secret, {}, async (err,info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' })
      
      const {id,title,summary,content} = req.body
      
      // Check if user is the author
      const isAuthor = await PostService.isAuthor(id, info.id)
      if (!isAuthor) {
        return res.status(403).json({error: 'You are not the author'})
      }

      // If updating with new image, delete old image from Supabase
      if (cover_image_url) {
        const oldPost = await PostService.findById(id);
        if (oldPost && oldPost.cover_image_url) {
          await StorageService.deleteFile(oldPost.cover_image_url);
        }
      }

      // Prepare update data
      const updateData = {
        title,
        summary,
        content
      }
      
      // Only update cover_image_url if a new file was uploaded
      if (cover_image_url) {
        updateData.cover_image_url = cover_image_url
      }

      const postDoc = await PostService.update(id, updateData)
      
      // Handle tags if provided
      if (req.body.tags) {
        try {
          const tags = JSON.parse(req.body.tags);
          await TagService.updatePostTags(id, tags);
        } catch (e) {
          console.log('Error parsing tags:', e);
        }
      }
      
      res.json(postDoc)
    })
  } catch(e) {
    console.log(e)
    res.status(400).json({ error: 'Failed to update post' })
  }
})

app.get('/post', async (req,res) => {
  try {
    // Get pagination parameters from query string
    const limit = parseInt(req.query.limit) || 5
    const page = parseInt(req.query.page) || 1
    const offset = (page - 1) * limit
    
    const posts = await PostService.getAll(limit, offset)
    
    // Transform the data to match frontend expectations
    const transformedPosts = posts.map(post => ({
      _id: post.post_id,
      title: post.title,
      summary: post.summary,
      content: post.content,
      cover: post.cover_image_url,
      author: {
        username: post.users.username,
        _id: post.users.user_id
      },
      createdAt: post.timestamp
    }))
    
    res.json(transformedPosts)
  } catch(e) {
    console.log('Supabase error:', e)
    // Fallback data for testing
    const mockPosts = [
      {
        _id: '1',
        title: 'Welcome to ThoughtLane',
        summary: 'This is a sample post to test the application',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
        cover: null,
        author: { username: 'admin' },
        createdAt: new Date()
      },
      {
        _id: '2',
        title: 'Getting Started',
        summary: 'Learn how to create your first post',
        content: 'To create a new post, click on the Create Post link...',
        cover: null,
        author: { username: 'admin' },
        createdAt: new Date()
      }
    ]
    res.json(mockPosts)
  }
})

app.get('/post/:id', async (req, res) => {
  try {
    const {id} = req.params
    const postDoc = await PostService.findById(id)
    
    if (!postDoc) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Get tags for this post
    const tags = await TagService.getByPostId(id);

    // Transform the data to match frontend expectations
    const transformedPost = {
      _id: postDoc.post_id,
      title: postDoc.title,
      summary: postDoc.summary,
      content: postDoc.content,
      cover: postDoc.cover_image_url,
      author: {
        username: postDoc.users.username,
        _id: postDoc.users.user_id
      },
      createdAt: postDoc.timestamp,
      tags: tags.map(t => t.name)
    }

    res.json(transformedPost)
  } catch(e) {
    console.log(e)
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

// Get all unique tags
app.get('/tags', async (req, res) => {
  try {
    const tags = await TagService.getAll();
    res.json(tags);
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
})

// Get posts by tag
app.get('/posts/tag/:tagName', async (req, res) => {
  try {
    const { tagName } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    const posts = await TagService.getPostsByTag(tagName, limit, offset);
    
    // Transform the data
    const transformedPosts = posts.map(post => ({
      _id: post.post_id,
      title: post.title,
      summary: post.summary,
      content: post.content,
      cover: post.cover_image_url,
      author: {
        username: post.users.username,
        _id: post.users.user_id
      },
      createdAt: post.timestamp
    }));
    
    res.json(transformedPosts);
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to fetch posts by tag' });
  }
})

// Delete post
app.delete('/post/:id', async (req, res) => {
  try {
    const {id} = req.params;
    const {token} = req.cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      
      // Check if user is the author
      const isAuthor = await PostService.isAuthor(id, info.id);
      if (!isAuthor) {
        return res.status(403).json({ error: 'You are not the author' });
      }
      
      // Get post to delete cover image if exists
      const post = await PostService.findById(id);
      if (post && post.cover_image_url) {
        await StorageService.deleteFile(post.cover_image_url);
      }
      
      // Delete associated tags
      await TagService.removeTagsFromPost(id);
      
      // Delete the post (cascade will handle comments and likes)
      await PostService.delete(id);
      
      res.json({ success: true });
    });
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to delete post' });
  }
})

// Create a comment
app.post('/comment', async (req, res) => {
  try {
    const { token } = req.cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      
      try {
        const { post_id, content } = req.body;
        
        if (!content || !content.trim()) {
          return res.status(400).json({ error: 'Comment content is required' });
        }
        
        const comment = await CommentService.create({
          post_id,
          user_id: info.id,
          content: content.trim()
        });
        
        res.json(comment);
      } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to create comment' });
      }
    });
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to create comment' });
  }
})

// Get comments for a post
app.get('/post/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await CommentService.getByPostId(id);
    
    // Transform to match frontend expectations
    const transformedComments = comments.map(comment => ({
      _id: comment.comment_id,
      content: comment.content,
      createdAt: comment.timestamp,
      author: {
        _id: comment.users.user_id,
        username: comment.users.username
      }
    }));
    
    res.json(transformedComments);
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
})

// Delete a comment
app.delete('/comment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      
      try {
        // Check if user is the author
        const isAuthor = await CommentService.isAuthor(id, info.id);
        if (!isAuthor) {
          return res.status(403).json({ error: 'You are not the author of this comment' });
        }
        
        await CommentService.delete(id);
        res.json({ success: true });
      } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to delete comment' });
      }
    });
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
})

// Toggle like on a post
app.post('/like/post/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      
      try {
        const result = await LikeService.togglePostLike(id, info.id);
        const likeCount = await LikeService.getPostLikeCount(id);
        
        res.json({ ...result, likeCount });
      } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to toggle like' });
      }
    });
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
})

// Toggle like on a comment
app.post('/like/comment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      
      try {
        const result = await LikeService.toggleCommentLike(id, info.id);
        const likeCount = await LikeService.getCommentLikeCount(id);
        
        res.json({ ...result, likeCount });
      } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to toggle like' });
      }
    });
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
})

// Get post likes info (count + user's like status)
app.get('/post/:id/likes', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.cookies;
    
    const likeCount = await LikeService.getPostLikeCount(id);
    let userLiked = false;
    
    if (token) {
      jwt.verify(token, secret, {}, async (err, info) => {
        try {
          if (!err) {
            userLiked = await LikeService.hasUserLikedPost(id, info.id);
          }
          res.json({ likeCount, userLiked });
        } catch(error) {
          console.log(error);
          res.status(500).json({ error: 'Failed to fetch likes' });
        }
      });
    } else {
      res.json({ likeCount, userLiked });
    }
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
})

// Get comment likes info (count + user's like status)
app.get('/comment/:id/likes', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.cookies;
    
    const likeCount = await LikeService.getCommentLikeCount(id);
    let userLiked = false;
    
    if (token) {
      jwt.verify(token, secret, {}, async (err, info) => {
        try {
          if (!err) {
            userLiked = await LikeService.hasUserLikedComment(id, info.id);
          }
          res.json({ likeCount, userLiked });
        } catch(error) {
          console.log(error);
          res.status(500).json({ error: 'Failed to fetch likes' });
        }
      });
    } else {
      res.json({ likeCount, userLiked });
    }
  } catch(e) {
    console.log(e);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Frontend URL: ${FRONTEND_URL}`)
})