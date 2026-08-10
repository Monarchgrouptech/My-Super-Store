import { Instagram, Facebook, Twitter, Gem } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center size-9 rounded-full bg-gradient-to-br from-[#FFE55C] to-[#B8941F] text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/30">
              <Gem size={18} strokeWidth={2.5} />
            </span>
            <div className="footer-brand" style={{ marginBottom: 0 }}>
              MY SUPER STORE
            </div>
          </div>
          <p className="text-muted" style={{ lineHeight: '1.7', fontSize: '0.9rem' }}>
            Nigeria's premier destination for premium electronics, fashion and home goods — curated with care, delivered with speed.
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
            <a href="https://www.instagram.com/mysuperstore" target="_blank" rel="noopener noreferrer" className="mini-btn text-muted hover:text-[#FFE55C] hover:-translate-y-0.5 transition-all duration-300" aria-label="Instagram">
              <Instagram size={22} strokeWidth={2.5} />
            </a>
            <a href="https://www.facebook.com/mysuperstore" target="_blank" rel="noopener noreferrer" className="mini-btn text-muted hover:text-[#FFE55C] hover:-translate-y-0.5 transition-all duration-300" aria-label="Facebook">
              <Facebook size={22} strokeWidth={2.5} />
            </a>
            <a href="https://x.com/mysuperstore" target="_blank" rel="noopener noreferrer" className="mini-btn text-muted hover:text-[#FFE55C] hover:-translate-y-0.5 transition-all duration-300" aria-label="X (Twitter)">
              <Twitter size={22} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© 2026 My Super Store. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/about" className="footer-link">Privacy Policy</Link>
          <Link to="/about" className="footer-link">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}