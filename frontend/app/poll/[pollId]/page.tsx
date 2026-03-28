type Props = {
  params: Promise<{ pollId: string }>;
};

export default async function PollDetailPage({ params }: Props) {
  const { pollId } = await params;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Poll {pollId}
      </h1>
      <p className="mt-2 max-w-xl text-(--muted)">
        Poll detail and results will load here once the program client is
        integrated.
      </p>
    </div>
  );
}
