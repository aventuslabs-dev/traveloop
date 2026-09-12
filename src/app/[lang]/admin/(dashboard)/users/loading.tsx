import { PageHeader } from "../ui";
import Skeleton from "../Skeleton";

export default function AdminCustomersLoading() {
  return (
    <>
      <PageHeader title="Customers" subtitle="Loading…" />
      <Skeleton stats={3} />
    </>
  );
}
