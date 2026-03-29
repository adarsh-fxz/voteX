import { PollDetailClient } from "@/components/PollDetailClient";

type Props = {
  params: Promise<{ pollId: string }>;
};

export default async function PollDetailPage({ params }: Props) {
  const { pollId } = await params;

  return (
    <div className="premium-section pb-12 pt-4 sm:pt-6">
      <PollDetailClient pollIdStr={pollId} />
    </div>
  );
}
