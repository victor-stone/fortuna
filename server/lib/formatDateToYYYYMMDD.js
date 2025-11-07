export default function formatDateToYYYYMMDD(dateString, fromUSA = false) {
  if (!dateString || !dateString.includes("/")) return "";
  const [day, month, year] = dateString.split("/");
  return fromUSA ? `${year}-${day}-${month}` : `${year}-${month}-${day}`;
}