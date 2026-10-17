import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
export const metadata: Metadata = {title:'MacTheme — A little more Mac. Still your Windows.',description:'A considered Windows 11 desktop companion. A spring-powered Dock, a familiar menu bar, instant app search, and a useful notch.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en" className={GeistSans.variable}><body>{children}</body></html>}
