import { Tag } from "antd";

const colors: Record<string, string> = {
  scheduled: "gold",
  completed: "green",
  cancelled: "red",
  active: "green",
  injured: "red",
  suspended: "gold",
  inactive: "default",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Tag color={colors[status] ?? "default"} className="!mr-0 font-semibold uppercase">
      {status}
    </Tag>
  );
}
