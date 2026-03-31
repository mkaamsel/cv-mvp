import Link from "next/link";

export default function Footer(): React.JSX.Element {
  return (
    <footer
      style={{
        marginTop: 48,
        padding: "20px 24px",
        borderTop: "1px solid #d7dfeb",
        display: "flex",
        justifyContent: "center",
        gap: 20,
        fontSize: 14,
      }}
    >
      <Link href="/privacy">Privacy</Link>
      <Link href="/cookies">Cookies</Link>
      <Link href="/terms">Terms</Link>
    </footer>
  );
}