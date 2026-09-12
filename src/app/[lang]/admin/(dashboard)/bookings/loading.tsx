import { PageHeader } from "../ui";
import Skeleton from "../Skeleton";

export default function AdminBookingsLoading() {
  return (
    <>
      <PageHeader title="Experience bookings" subtitle="Loading…" />
      <Skeleton stats={4} />
    </>
  );
}
