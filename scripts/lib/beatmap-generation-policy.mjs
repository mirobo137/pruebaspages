export function canOverwriteBeatmap(existingDocument, force) {
  if (!existingDocument) return true;
  if (!force) return false;
  if (existingDocument.locked === true) return false;
  return existingDocument.generated === true;
}
