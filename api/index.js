// Load environment variables from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const express = require('express')
const cors = require('cors')
const UserService = require('./services/UserService')
const PostService = require('./services/PostService')
const StorageService = require('./services/StorageService')
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
      res.json(postDoc)
    })
  } catch(e) {
    console.log(e)
    res.status(400).json({ error: 'Failed to update post' })
  }
})

app.get('/post', async (req,res) => {
  try {
    const posts = await PostService.getAll(20, 0)
    
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
      createdAt: postDoc.timestamp
    }

    res.json(transformedPost)
  } catch(e) {
    console.log(e)
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Frontend URL: ${FRONTEND_URL}`)
})