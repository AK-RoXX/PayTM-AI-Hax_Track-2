import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paytm Sahaayak — AI Financial Case Manager',
  description:
    'Evidence-first AI assistant for medical emergencies. Understand your insurance coverage, collect documents, and get one clear next step — in seconds.',
  keywords: ['insurance', 'medical claim', 'hospital', 'AI assistant', 'Paytm', 'financial guidance'],
  openGraph: {
    title: 'Paytm Sahaayak — AI Financial Case Manager',
    description: 'Evidence-first AI assistant for medical emergencies.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
