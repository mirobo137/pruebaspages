export function canOverwriteBeatmap(existingDocument, force) {
  if (!existingDocument) return true;
  if (!force) return false;
  if (existingDocument.locked === true) return false;
  if (existingDocument.schemaVersion === 2) return existingDocument.locked === false;
  return existingDocument.generated === true;
}
