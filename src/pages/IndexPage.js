import Post from "../Post"
import {useEffect, useState} from "react"
import API_BASE_URL from "../config/api"

export default function IndexPage() {
  const [posts,setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE_URL}/post`)
      .then(response => {
        if (response.ok) {
          return response.json()
        } else {
          throw new Error('Failed to fetch posts')
        }
      })
      .then(posts => {
        setPosts(posts)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching posts:', error)
        setError('Failed to load posts. Please check if the server is running.')
        setLoading(false)
      })
  }, [])
  
  if (loading) {
    return <div>Loading posts...</div>
  }
  
  if (error) {
    return <div style={{color: 'red', padding: '20px'}}>{error}</div>
  }
  
  if (posts.length === 0) {
    return <div>No posts available. Create your first post!</div>
  }
  
  return (
    <>
      {posts.map(post => (
        <Post key={post._id} {...post} />
      ))}
    </>
  )
}