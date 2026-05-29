import { Instagram, Facebook, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div className="footer-brand">
            MY SUPERSTORE
          </div>
          <p className="text-muted" style={{ lineHeight: '1.6' }}>
            Curating excellence in luxury fashion and accessories since 2025.
          </p>
        </div>

        {/* Shop */}
        <div>
          <h4 className="footer-heading">Shop</h4>
          <ul className="footer-links">
            <li><Link to="/shop?sort=newest" className="footer-link">New Arrivals</Link></li>
            <li><Link to="/shop?sort=featured" className="footer-link">Best Sellers</Link></li>
            <li><Link to="/shop" className="footer-link">Collections</Link></li>
            <li><Link to="/shop" className="footer-link">Sale</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="footer-heading">Support</h4>
          <ul className="footer-links">
            <li><Link to="/about" className="footer-link">Contact Us</Link></li>
            <li><Link to="/about" className="footer-link">Shipping Info</Link></li>
            <li><Link to="/about" className="footer-link">Returns</Link></li>
            <li><Link to="/about" className="footer-link">FAQ</Link></li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4 className="footer-heading">Connect</h4>
          <div className="flex gap-6">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-[#FFE55C] transition-colors">
              <Instagram size={24} strokeWidth={2.5} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-[#FFE55C] transition-colors">
              <Facebook size={24} strokeWidth={2.5} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-[#FFE55C] transition-colors">
              <Twitter size={24} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© 2025 LUXE. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/about" className="footer-link">Privacy Policy</Link>
          <Link to="/about" className="footer-link">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}