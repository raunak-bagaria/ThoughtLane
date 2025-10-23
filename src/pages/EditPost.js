import {useEffect, useState} from "react"
import {Navigate, useParams} from "react-router-dom"
import Editor from "../Editor"
import TagInput from "../components/TagInput"
import API_BASE_URL from "../config/api"

export default function EditPost() {
  const {id} = useParams()
  const [title,setTitle] = useState('')
  const [summary,setSummary] = useState('')
  const [content,setContent] = useState('')
  const [files, setFiles] = useState('')
  const [tags, setTags] = useState([])
  const [redirect, setRedirect] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE_URL}/post/${id}`)
      .then(response => {
        response.json().then(postInfo => {
          setTitle(postInfo.title)
          setContent(postInfo.content)
          setSummary(postInfo.summary)
          if (postInfo.tags && postInfo.tags.length > 0) {
            setTags(postInfo.tags)
          }
        })
      })
  }, [id])

  async function updatePost(ev) {
    ev.preventDefault()
    const data = new FormData()
    data.set('title', title)
    data.set('summary', summary)
    data.set('content', content)
    data.set('id', id)
    if (files?.[0]) {
      data.set('file', files?.[0])
    }
    
    // Process tags - send as JSON array
    data.set('tags', JSON.stringify(tags));
    
    const response = await fetch(`${API_BASE_URL}/post`, {
      method: 'PUT',
      body: data,
      credentials: 'include',
    })
    if (response.ok) {
      setRedirect(true)
    }
  }

  if (redirect) {
    return <Navigate to={'/post/'+id} />
  }

  return (
    <form onSubmit={updatePost}>
      <input type="title"
             placeholder={'Title'}
             value={title}
             onChange={ev => setTitle(ev.target.value)} />
      <input type="summary"
             placeholder={'Summary'}
             value={summary}
             onChange={ev => setSummary(ev.target.value)} />
      <TagInput 
        selectedTags={tags}
        onTagsChange={setTags}
      />
      <input type="file"
             onChange={ev => setFiles(ev.target.files)} />
      <Editor onChange={setContent} value={content} />
      <button style={{marginTop:'5px'}}>Update post</button>
    </form>
  )
}