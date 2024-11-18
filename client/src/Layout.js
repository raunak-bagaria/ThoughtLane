import Header from "./Header"
import {Link, Outlet} from "react-router-dom"

export default function Layout() {
  return (
    <main>
      <Header/>
      <Outlet/>
      <footer>
        <Link to="/about">About Us</Link>
      </footer>
    </main>
  );
}