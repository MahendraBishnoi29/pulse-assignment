import { Link, useNavigate } from "react-router-dom";
import { LogOut, Video as VideoIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-emerald-500 focus-ring rounded">
            <VideoIcon className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight text-white">Pulse</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 mr-2 sm:mr-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-zinc-200">{user.name}</div>
                    <div className="text-xs text-zinc-500 capitalize">{user.role}</div>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <span className="text-sm font-bold text-emerald-400">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors focus-ring"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors focus-ring rounded-lg"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors focus-ring"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
