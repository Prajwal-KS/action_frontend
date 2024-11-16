import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, FileVideo, HelpCircle, Moon, Sun, Rocket, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { LucideIcon } from 'lucide-react';

interface NavLinkProps {
  to: string;
  icon: LucideIcon;
  text: string;
}

const Navbar = () => {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, text }) => (
    <Link
      to={to}
      onClick={() => setIsMenuOpen(false)}
      className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive(to)
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </Link>
  );

  return (
    <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg sticky top-0 z-50 transition-colors duration-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 group">
              <FileVideo className="h-7 w-7 text-primary-600 dark:text-primary-400 
                                group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 
                           bg-clip-text text-transparent">
                ActionAI
              </span>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex space-x-1">
              <NavLink to="/" icon={Rocket} text="Process" />
              <NavLink to="/model-details" icon={Brain} text="Model Details" />
              <NavLink to="/faq" icon={HelpCircle} text="FAQ" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                       transition-colors duration-200 group"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-yellow-500 group-hover:rotate-180 transition-transform duration-300" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600 group-hover:rotate-180 transition-transform duration-300" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                       transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-2 space-y-1 border-t border-gray-200 dark:border-gray-700">
            <NavLink to="/" icon={Rocket} text="Process" />
            <NavLink to="/model-details" icon={Brain} text="Model Details" />
            <NavLink to="/faq" icon={HelpCircle} text="FAQ" />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;