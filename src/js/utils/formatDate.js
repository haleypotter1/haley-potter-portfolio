const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

export function formatDateRange(start, end, current) {
  return `${formatMonthYear(start)} — ${current ? 'Present' : formatMonthYear(end)}`;
}
