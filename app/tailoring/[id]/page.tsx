type TailoringDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TailoringDetailPage({
  params,
}: TailoringDetailPageProps) {
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Saved Draft</h1>
      <p>Draft ID: {id}</p>
      <p>This page is not implemented yet.</p>
    </main>
  );
}