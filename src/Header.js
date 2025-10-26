import {Link, useNavigate} from "react-router-dom"
import {useContext, useEffect} from "react"
import {UserContext} from "./UserContext"
import API_BASE_URL from "./config/api"

export default function Header() {
  const {setUserInfo,userInfo} = useContext(UserContext)
  const navigate = useNavigate()
  useEffect(() => {
    fetch(`${API_BASE_URL}/profile`, {
      credentials: 'include',
    }).then(response => {
      response.json().then(userInfo => {
        setUserInfo(userInfo)
      })
    })
  }, [setUserInfo])

  function logout() {
    if (window.confirm('Are you sure you want to logout?')) {
      fetch(`${API_BASE_URL}/logout`, {
        credentials: 'include',
        method: 'POST',
      }).then(() => {
        setUserInfo(null)
        navigate('/')
      })
    }
  }

  const username = userInfo?.username

  return (
    <header>
      <div className="header-content"> {/* <-- ADD THIS WRAPPER */}
        <Link to="/" className="logo">
          {<img src="/logo.jpg" alt="ThoughtLane Logo"/>}
        </Link>
        <nav>
          {username && (
            <>
              <Link to="/create">New Post</Link>
              <button onClick={logout}>Logout ({username})</button>
            </>
          )}
          {!username && (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div> {/* <-- AND CLOSE IT HERE */}
    </header>
  )
}
