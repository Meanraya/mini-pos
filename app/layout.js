import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Mini POS',
  description: 'ระบบขายหน้าร้านขนาดเล็ก',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <header className="navbar">
          <div className="nav-container">
            <Link href="/" className="nav-brand">
              🛒 Mini POS
            </Link>
            <nav className="nav-menu">
              <Link href="/" className="nav-link">
                จัดการสินค้า
              </Link>
              <Link href="/sell" className="nav-link">
                ขายสินค้า
              </Link>
              <Link href="/history" className="nav-link">
                ประวัติการขาย
              </Link>
            </nav>
          </div>
        </header>

        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
