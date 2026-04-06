export default function CookiesPage(): React.JSX.Element {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1>Cookie Policy</h1>
      <p>
        This application uses cookies and browser storage solely to keep you
        signed in and maintain your session. No advertising cookies or
        third-party tracking cookies are used.
      </p>
      <p>
        Session cookies are deleted when you log out or close your browser.
        Local storage may be used to preserve draft state within your current
        session and is not shared with any third party.
      </p>
      <p>
        A more detailed cookie notice will be added before public release.
      </p>
    </main>
  );
}
