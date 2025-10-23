import 'react-quill/dist/quill.snow.css'
import {useState} from "react"
import {Navigate} from "react-router-dom"
import {useContext} from "react";
import {UserContext} from "../UserContext";
import Editor from "../Editor"
import TagInput from "../components/TagInput"
import API_BASE_URL from "../config/api"

export default function CreatePost() {
  const {userInfo} = useContext(UserContext)
  const [title,setTitle] = useState('')
  const [summary,setSummary] = useState('')
  const [content,setContent] = useState('')
  const [files, setFiles] = useState('')
  const [tags, setTags] = useState([])
  const [redirect, setRedirect] = useState(false)

  const username = userInfo?.username
  if (!username) {
    alert("Please login first")
    return <Navigate to={'/login'} />
  }

  async function createNewPost(ev) {
    ev.preventDefault()
    const data = new FormData()
    data.set('title', title)
    data.set('summary', summary)
    data.set('content', content)
    data.set('file', files[0])
    
    // Process tags - send as JSON array
    if (tags.length > 0) {
      data.set('tags', JSON.stringify(tags));
    }
    
    const response = await fetch(`${API_BASE_URL}/post`, {
      method: 'POST',
      body: data,
      credentials: 'include',
    })
    if (response.ok) {
      setRedirect(true)
    }
  }

  if (redirect) {
    return <Navigate to={'/'} />
  }
  return (
    <form onSubmit={createNewPost}>
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
      <Editor value={content} onChange={setContent} />
      <button style={{marginTop:'5px'}}>Create post</button>
    </form>
  )
}