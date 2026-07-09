"use client";

import { Select } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type FilterDef = {
  param: string;
  placeholder: string;
  options: { value: string; label: string }[];
};

export function FilterBar({ filters }: { filters: FilterDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(param: string, value?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }

  return (
    <div className="mb-5 flex flex-wrap gap-3">
      {filters.map((f) => (
        <Select
          key={f.param}
          allowClear
          placeholder={f.placeholder}
          className="min-w-44"
          value={searchParams.get(f.param) ?? undefined}
          options={f.options}
          onChange={(value) => setParam(f.param, value)}
        />
      ))}
    </div>
  );
}
