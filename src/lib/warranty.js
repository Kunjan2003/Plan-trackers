/** Add a warranty length using local calendar dates and clamp month ends safely. */
export function addWarrantyDuration(date, value, unit = "months") {
  if (!date || !Number.isFinite(Number(value))) return "";
  const result = new Date(`${date}T12:00:00`);
  if (Number.isNaN(result.getTime())) return "";
  if (unit === "days") result.setDate(result.getDate() + Number(value));
  else {
    const months = Number(value) * (unit === "years" ? 12 : 1);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    result.setDate(
      Math.min(
        day,
        new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate(),
      ),
    );
  }
  return result.toISOString().slice(0, 10);
}

/** Parse receipt dates. Ambiguous dates default to day/month for the en-IN app locale. */
export function parseReceiptDate(raw) {
  const parts = String(raw || "").split(/[/-]/);
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part)))
    return null;
  const [first, second] = parts.slice(0, 2).map(Number);
  let year = parts[2];
  if (year.length === 2) year = `20${year}`;
  const dayFirst = first > 12 || second <= 12;
  const day = dayFirst ? first : second;
  const month = dayFirst ? second : first;
  if (year.length !== 4 || month < 1 || month > 12 || day < 1 || day > 31)
    return null;
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${value}T12:00:00`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  )
    return null;
  return value;
}

export function itemFingerprint(item) {
  return `${String(item?.name || "")
    .trim()
    .toLocaleLowerCase()}|${item?.purchase_date || ""}`;
}

function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function isValidWarranty(item) {
  return (
    typeof item?.name === "string" &&
    Boolean(item.name.trim()) &&
    isRealDate(item.purchase_date) &&
    isRealDate(item.warranty_end) &&
    item.warranty_end > item.purchase_date
  );
}
