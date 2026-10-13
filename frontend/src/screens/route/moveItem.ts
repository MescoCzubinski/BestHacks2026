export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const inRange = (i: number) => i >= 0 && i < list.length;
  if (from === to || !inRange(from) || !inRange(to)) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}
