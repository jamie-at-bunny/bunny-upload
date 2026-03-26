import "@bunny.net/upload-core/styles.css";

export const metadata = {
  title: "Bunny Upload — i18n Example",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
