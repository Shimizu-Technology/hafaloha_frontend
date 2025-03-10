// src/shared/components/navigation/Footer.tsx

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { formatPhoneNumber } from '../../utils/formatters';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { restaurant, fetchRestaurant } = useRestaurantStore();
  
  useEffect(() => {
    if (!restaurant) {
      fetchRestaurant();
    }
  }, [restaurant, fetchRestaurant]);

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-bold text-[#c1902f] mb-4">Hafaloha</h2>
            <p className="text-gray-300 mb-4">
              Authentic Hawaiian cuisine with a modern twist. Serving the freshest
              ingredients in a relaxed, tropical atmosphere.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#c1902f]"
              >
                <Facebook />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#c1902f]"
              >
                <Instagram />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#c1902f]"
              >
                <Twitter />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/menu" className="text-gray-300 hover:text-white">
                  Menu
                </Link>
              </li>
              <li>
                <Link to="/reservations" className="text-gray-300 hover:text-white">
                  Reservations
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-gray-300 hover:text-white">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <address className="not-italic text-gray-300 space-y-2">
              <p>{restaurant?.address || "955 Pale San Vitores Rd"}</p>
              <p>Tamuning, Guam 96913</p>
              <p>Phone: {formatPhoneNumber(restaurant?.phone_number) || "+1 (671) 989-3444"}</p>
              <p>Email: {restaurant?.contact_email || "sales@hafaloha.com"}</p>
            </address>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {currentYear} Hafaloha. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
