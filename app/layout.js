import './globals.css'
import { Providers } from './providers'

export const metadata = { title: 'Zalio ERP', description: 'Sistem ERP dan POS terintegrasi Zalio' }

export default function RootLayout({ children }) { return <html lang="id"><body><Providers>{children}</Providers></body></html> }