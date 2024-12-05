import TokenDetail from "@/components/token-detail/token-detail";

export default function TokenDetailPage({
  params,
}: {
  params: { address: string };
}) {
  return <TokenDetail address={params.address} />;
}
