import { collections } from "@/lib/corpus";

export const docketNo = (id: string) => `No. ${id.toUpperCase()}`;

export const recordGroupLabel = (id: string) =>
  collections.find((collection) => collection.id === id)?.label ?? id;
