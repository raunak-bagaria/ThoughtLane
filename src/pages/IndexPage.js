import Post from "../Post"
import {useEffect, useState} from "react"
import API_BASE_URL from "../config/api"

export default function IndexPage() {
  const [posts,setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [tags, setTags] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const postsPerPage = 5
  
  // Fetch all tags
  useEffect(() => {
    fetch(`${API_BASE_URL}/tags`)
      .then(response => response.json())
      .then(data => setTags(data))
      .catch(error => console.error('Error fetching tags:', error))
  }, [])
  
  useEffect(() => {
    setLoading(true)
    const url = selectedTag 
      ? `${API_BASE_URL}/posts/tag/${encodeURIComponent(selectedTag)}?limit=${postsPerPage}&page=${currentPage}`
      : `${API_BASE_URL}/post?limit=${postsPerPage}&page=${currentPage}`;
      
    fetch(url)
      .then(response => {
        if (response.ok) {
          return response.json()
        } else {
          throw new Error('Failed to fetch posts')
        }
      })
      .then(posts => {
        setPosts(posts)
        setHasMore(posts.length === postsPerPage)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching posts:', error)
        setError('Failed to load posts. Please check if the server is running.')
        setLoading(false)
      })
  }, [currentPage, selectedTag])
  
  const handleTagChange = (tagName) => {
    setSelectedTag(tagName)
    setCurrentPage(1) // Reset to first page when changing tag
  }
  
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
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by tag:</label>
        <select 
          value={selectedTag} 
          onChange={(e) => handleTagChange(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '5px', border: '2px solid #ddd' }}
        >
          <option value="">All Posts</option>
          {tags.map((tag, index) => (
            <option key={index} value={tag.name}>{tag.name}</option>
          ))}
        </select>
      </div>
      
      {posts.map(post => (
        <Post key={post._id} {...post} />
      ))}
      
      {/* --- REPLACE IT WITH THIS --- */}
      <div className="pagination">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          ← Previous
        </button>
        <span>
          Page {currentPage}
        </span>
        <button 
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={!hasMore}
        >
          Next →
        </button>
      </div>
    </>
  )
}