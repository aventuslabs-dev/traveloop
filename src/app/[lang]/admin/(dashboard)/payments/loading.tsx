import { PageHeader } from "../ui";
import Skeleton from "../Skeleton";

export default function AdminPaymentsLoading() {
  return (
    <>
      <PageHeader title="Failed payments" subtitle="Loading…" />
      <Skeleton stats={4} />
    </>
  );
}
