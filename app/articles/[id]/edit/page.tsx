import ArticleEditClient from "./ArticleEditClient";

type PageParams = Promise<{ id: string }>;

export default async function ArticleEditPage({ params }: { params: PageParams }) {
  const { id } = await params;
  return <ArticleEditClient articleId={id} />;
}
