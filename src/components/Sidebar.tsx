'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const isLinkActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🌿</div>
        <span>EcoSphere</span>
      </div>

      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-menu">
          <li className="nav-group-title">Overview</li>
          <li>
            <Link href="/" className={`nav-link ${isLinkActive('/') ? 'active' : ''}`}>
              <span>📊</span>
              <span>Dashboard</span>
            </Link>
          </li>

          <li className="nav-group-title">ESG Verticals</li>
          <li>
            <Link href="/environmental" className={`nav-link ${isLinkActive('/environmental') ? 'active' : ''}`}>
              <span>🍀</span>
              <span>Environmental</span>
            </Link>
          </li>
          <li>
            <Link href="/social" className={`nav-link ${isLinkActive('/social') ? 'active' : ''}`}>
              <span>🤝</span>
              <span>Social</span>
            </Link>
          </li>
          <li>
            <Link href="/governance" className={`nav-link ${isLinkActive('/governance') ? 'active' : ''}`}>
              <span>⚖️</span>
              <span>Governance</span>
            </Link>
          </li>

          <li className="nav-group-title">Culture & Insights</li>
          <li>
            <Link href="/gamification" className={`nav-link ${isLinkActive('/gamification') ? 'active' : ''}`}>
              <span>🏆</span>
              <span>Gamification</span>
            </Link>
          </li>
          <li>
            <Link href="/reports" className={`nav-link ${isLinkActive('/reports') ? 'active' : ''}`}>
              <span>📁</span>
              <span>Reports</span>
            </Link>
          </li>
          <li>
            <Link href="/profile" className={`nav-link ${isLinkActive('/profile') ? 'active' : ''}`}>
              <span>👤</span>
              <span>My Profile</span>
            </Link>
          </li>
          <li>
            <Link href="/settings" className={`nav-link ${isLinkActive('/settings') ? 'active' : ''}`}>
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
