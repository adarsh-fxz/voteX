import { PollDetailClient } from "@/components/PollDetailClient";

type Props = {
  params: Promise<{ pollId: string }>;
};

export default async function PollDetailPage({ params }: Props) {
  const { pollId } = await params;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Poll {pollId}</h1>
      <div className="mt-6">
        <PollDetailClient pollIdStr={pollId} />
      </div>
    </div>
  );
}
