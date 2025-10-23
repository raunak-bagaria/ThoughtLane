import {useContext, useEffect, useState} from "react"
import {useParams, useNavigate} from "react-router-dom"
import {format} from "date-fns"
import {UserContext} from "../UserContext"
import {Link} from 'react-router-dom'
import API_BASE_URL from "../config/api"

export default function PostPage() {
  const [postInfo,setPostInfo] = useState(null)
  const [comments, setComments] = useState([])
  const [commentContent, setCommentContent] = useState('')
  const [postLikes, setPostLikes] = useState({ likeCount: 0, userLiked: false })
  const [commentLikes, setCommentLikes] = useState({})
  const {userInfo} = useContext(UserContext)
  const {id} = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    fetch(`${API_BASE_URL}/post/${id}`)
      .then(response => {
        response.json().then(postInfo => {
          setPostInfo(postInfo);
        });
      });
    
    // Fetch comments
    fetch(`${API_BASE_URL}/post/${id}/comments`)
      .then(response => {
        response.json().then(async (comments) => {
          setComments(comments);
          
          // Fetch likes for each comment
          const likesData = {};
          for (const comment of comments) {
            const likesRes = await fetch(`${API_BASE_URL}/comment/${comment._id}/likes`, {
              credentials: 'include'
            });
            const likes = await likesRes.json();
            likesData[comment._id] = likes;
          }
          setCommentLikes(likesData);
        });
      });
    
    // Fetch post likes
    fetch(`${API_BASE_URL}/post/${id}/likes`, {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(likes => setPostLikes(likes));
  }, [id]);
  
  async function deletePost() {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }
    
    const response = await fetch(`${API_BASE_URL}/post/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    
    if (response.ok) {
      navigate('/')
    } else {
      alert('Failed to delete post')
    }
  }

  async function createComment(ev) {
    ev.preventDefault();
    
    if (!commentContent.trim()) {
      alert('Please enter a comment');
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        post_id: id,
        content: commentContent
      })
    });
    
    if (response.ok) {
      setCommentContent('');
      // Refresh comments
      const commentsResponse = await fetch(`${API_BASE_URL}/post/${id}/comments`);
      const updatedComments = await commentsResponse.json();
      setComments(updatedComments);
      
      // Refresh comment likes
      const likesData = {};
      for (const comment of updatedComments) {
        const likesRes = await fetch(`${API_BASE_URL}/comment/${comment._id}/likes`, {
          credentials: 'include'
        });
        const likes = await likesRes.json();
        likesData[comment._id] = likes;
      }
      setCommentLikes(likesData);
    } else {
      alert('Failed to create comment');
    }
  }

  async function deleteComment(commentId) {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      const response = await fetch(`${API_BASE_URL}/comment/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Refresh comments
        const commentsResponse = await fetch(`${API_BASE_URL}/post/${id}/comments`);
        const updatedComments = await commentsResponse.json();
        setComments(updatedComments);
        
        // Refresh comment likes
        const likesData = {};
        for (const comment of updatedComments) {
          const likesRes = await fetch(`${API_BASE_URL}/comment/${comment._id}/likes`, {
            credentials: 'include'
          });
          const likes = await likesRes.json();
          likesData[comment._id] = likes;
        }
        setCommentLikes(likesData);
      } else {
        alert('Failed to delete comment');
      }
    }
  }

  async function togglePostLike() {
    if (!userInfo?.id) {
      alert('Please login to like posts');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/like/post/${id}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setPostLikes({ likeCount: data.likeCount, userLiked: data.liked });
    }
  }

  async function toggleCommentLike(commentId) {
    if (!userInfo?.id) {
      alert('Please login to like comments');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/like/comment/${commentId}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: { likeCount: data.likeCount, userLiked: data.liked }
      }));
    }
  }

  if (!postInfo) return ''

  // Check if cover is a full URL (Supabase) or relative path (local)
  const coverImageUrl = postInfo.cover && postInfo.cover.startsWith('http') 
    ? postInfo.cover 
    : `${API_BASE_URL}/${postInfo.cover}`;

  return (
    <div className="post-page">
      <h1>{postInfo.title}</h1>
      <time>{format(new Date(postInfo.createdAt), "d MMM, yyyy  HH:mm")}</time>
      <div className="author">by @{postInfo.author.username}</div>
      {postInfo.tags && postInfo.tags.length > 0 && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {postInfo.tags.map((tag, index) => (
            <span 
              key={index} 
              style={{ 
                display: 'inline-block',
                backgroundColor: '#007BFF',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '15px',
                marginRight: '5px',
                fontSize: '0.85rem'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {userInfo?.id === postInfo.author._id && (
        <div className="edit-row">
          <Link className="edit-btn" to={`/edit/${postInfo._id}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit this post
          </Link>
          <button 
            onClick={deletePost}
            style={{ 
              backgroundColor: '#dc3545',
              marginTop: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: '20px', height: '20px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete this post
          </button>
        </div>
      )}
      <div className="image">
        {postInfo.cover && (
          <img src={coverImageUrl} alt=""/>
        )}
      </div>
      <div className="content" dangerouslySetInnerHTML={{__html:postInfo.content}} />
      
      {/* Post Like Button */}
      <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
        <button
          onClick={togglePostLike}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: postLikes.userLiked ? '#007BFF' : '#f0f0f0',
            color: postLikes.userLiked ? 'white' : '#333',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill={postLikes.userLiked ? "currentColor" : "none"}
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            style={{width: '20px', height: '20px'}}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span>{postLikes.likeCount} {postLikes.likeCount === 1 ? 'Like' : 'Likes'}</span>
        </button>
      </div>
      
      {/* Comments Section */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
        <h3>Comments ({comments.length})</h3>
        
        {userInfo?.id && (
          <form onSubmit={createComment} style={{ marginTop: '20px', marginBottom: '30px' }}>
            <textarea
              placeholder="Write a comment..."
              value={commentContent}
              onChange={ev => setCommentContent(ev.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                minHeight: '80px',
                fontFamily: 'inherit',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              style={{
                marginTop: '10px',
                padding: '8px 20px',
                backgroundColor: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Post Comment
            </button>
          </form>
        )}
        
        {!userInfo?.id && (
          <p style={{ color: '#666', fontStyle: 'italic', marginTop: '20px' }}>
            Please login to comment
          </p>
        )}
        
        <div style={{ marginTop: '20px' }}>
          {comments.map(comment => (
            <div key={comment._id} style={{
              padding: '15px',
              marginBottom: '15px',
              backgroundColor: '#f9f9f9',
              borderRadius: '5px',
              border: '1px solid #eee'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong>{comment.author.username}</strong>
                  <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {userInfo?.id === comment.author._id && (
                  <button
                    onClick={() => deleteComment(comment._id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p style={{ margin: 0, marginBottom: '10px' }}>{comment.content}</p>
              
              {/* Comment Like Button */}
              <button
                onClick={() => toggleCommentLike(comment._id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  backgroundColor: commentLikes[comment._id]?.userLiked ? '#007BFF' : 'transparent',
                  color: commentLikes[comment._id]?.userLiked ? 'white' : '#666',
                  border: '1px solid #ddd',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill={commentLikes[comment._id]?.userLiked ? "currentColor" : "none"}
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5} 
                  stroke="currentColor" 
                  style={{width: '14px', height: '14px'}}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <span>{commentLikes[comment._id]?.likeCount || 0}</span>
              </button>
            </div>
          ))}
          
          {comments.length === 0 && (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}