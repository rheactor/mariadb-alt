export const splice = (array: unknown[], item: unknown) => {
  const itemIndex = array.indexOf(item);

  if (itemIndex !== -1) {
    array.splice(itemIndex, 1);
  }
};
