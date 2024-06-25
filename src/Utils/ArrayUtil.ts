export function removeItem<T>(array: T[], item: T) {
  const itemIndex = array.indexOf(item);

  if (itemIndex !== -1) {
    array.splice(itemIndex, 1);
  }
}
