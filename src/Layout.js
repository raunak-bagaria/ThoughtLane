import Header from "./Header"
import {Link, Outlet} from "react-router-dom"

export default function Layout() {
  return (
    <> {/* Use a Fragment wrapper */}
      <Header/> {/* Header is now outside main */}
      <main>
        <Outlet/>
        <footer>
          <Link to="/about">About Us</Link>
        </footer>
      </main>
    </>
  );
}
