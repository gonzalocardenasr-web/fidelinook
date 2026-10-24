import { redirect } from "next/navigation";

type Query = Record<string, string | string[] | undefined>;
export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  const input = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["from", "to", "channel", "topN", "rankBy"]) {
    const value = input[key];
    if (typeof value === "string" && value.length <= 40) params.set(key, value);
  }
  const suffix = params.toString();
  redirect(`/gestion/analytics${suffix ? `?${suffix}` : ""}`);
}
