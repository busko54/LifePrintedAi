import './globals.css'

export const metadata = {
  title: 'LifeBook — Your ChatGPT History, Decoded',
  description: 'Upload your ChatGPT history and get a personal life book with chapters, insights and patterns.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
