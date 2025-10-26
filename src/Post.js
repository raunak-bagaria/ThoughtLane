import {format} from "date-fns"
import {Link} from "react-router-dom"
import API_BASE_URL from "./config/api"

export default function Post({_id,title,summary,cover,content,createdAt,author}) {
  // Check if cover is a full URL (Supabase) or relative path (local)
  const coverImageUrl = cover && cover.startsWith('http') 
    ? cover 
    : `${API_BASE_URL}/${cover}`;

  return (
    <div className="post">
      <div className="image">
        <Link to={`/post/${_id}`}>
          {cover && (
            <img src={coverImageUrl} alt=""/>
          )}
        </Link>
      </div>
      <div className="texts">
        <Link to={`/post/${_id}`}>
        <h2>{title}</h2>
        </Link>
        <p className="info">
          <span className="author">{author.username}</span>
          <time>{format(new Date(createdAt), "d MMM, yyyy  HH:mm")}</time>
        </p>
        <p className="summary">{summary}</p>
      </div>
    </div>
  );
}