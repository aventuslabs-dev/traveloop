import { PageHeader } from "./ui";
import Skeleton from "./Skeleton";

export default function AdminOrdersLoading() {
  return (
    <>
      <PageHeader title="Orders" subtitle="Loading…" />
      <Skeleton stats={4} />
    </>
  );
}
