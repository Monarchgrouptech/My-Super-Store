import { Instagram, Facebook, Twitter } from 'lucide-react';

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
            <li><a href="#" className="footer-link">New Arrivals</a></li>
            <li><a href="#" className="footer-link">Best Sellers</a></li>
            <li><a href="#" className="footer-link">Collections</a></li>
            <li><a href="#" className="footer-link">Sale</a></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="footer-heading">Support</h4>
          <ul className="footer-links">
            <li><a href="#" className="footer-link">Contact Us</a></li>
            <li><a href="#" className="footer-link">Shipping Info</a></li>
            <li><a href="#" className="footer-link">Returns</a></li>
            <li><a href="#" className="footer-link">FAQ</a></li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4 className="footer-heading">Connect</h4>
          <div className="flex gap-6">
            <a href="#" className="text-muted hover:text-[#FFE55C] transition-colors">
              <Instagram size={24} strokeWidth={2.5} />
            </a>
            <a href="#" className="text-muted hover:text-[#FFE55C] transition-colors">
              <Facebook size={24} strokeWidth={2.5} />
            </a>
            <a href="#" className="text-muted hover:text-[#FFE55C] transition-colors">
              <Twitter size={24} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© 2025 LUXE. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="footer-link">Privacy Policy</a>
          <a href="#" className="footer-link">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}