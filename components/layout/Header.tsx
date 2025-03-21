import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center z-10 relative">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center w-full">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden text-gray-500 hover:text-gray-600 focus:outline-none"
          onClick={onToggleSidebar}
        >
          <span className="sr-only">Open sidebar</span>
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4 lg:mx-8">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-5 w-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </form>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center space-x-2 focus:outline-none"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <span className="text-sm font-medium text-gray-700 hidden sm:block">John Smith</span>
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <span className="text-sm font-medium">JS</span>
            </div>
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
              <Link href="/profile">
                <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Your Profile
                </span>
              </Link>
              <Link href="/settings">
                <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Settings
                </span>
              </Link>
              <Link href="/api/auth/signout">
                <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Sign out
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
