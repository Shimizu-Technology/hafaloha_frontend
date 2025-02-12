// src/ordering/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {/* Logo/About */}
          <div>
            <h3 className="font-display text-2xl mb-4">håfaloha!</h3>
            <p className="text-gray-400 mb-4">
              Experience the flavors of two islands, where Chamorro and Hawaiian cuisines come together.
            </p>
            <div className="flex space-x-4">
              <a href="https://instagram.com" className="text-gray-400 hover:text-white">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="https://facebook.com" className="text-gray-400 hover:text-white">
                <Facebook className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact &amp; Location</h4>
            <div className="space-y-2">
              <p className="flex items-center text-gray-400">
                <MapPin className="h-5 w-5 mr-2" />
                Tamuning, Guam
              </p>
              <a
                href="tel:+16719893444"
                className="flex items-center text-gray-400 hover:text-white"
              >
                <Phone className="h-5 w-5 mr-2" />
                (671) 989-3444
              </a>
              <p className="flex items-center text-gray-400">
                <Clock className="h-5 w-5 mr-2" />
                11AM-9PM Daily
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <nav className="space-y-2">
              <Link to="/menu" className="block text-gray-400 hover:text-white">
                Menu
              </Link>
              <Link to="/cart" className="block text-gray-400 hover:text-white">
                Cart
              </Link>
              <a href="#" className="block text-gray-400 hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="block text-gray-400 hover:text-white">
                Terms of Service
              </a>
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Håfaloha. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
