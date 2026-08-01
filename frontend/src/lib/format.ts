export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

export function formatRelativeDate(value: string, now = new Date()): string {
  const date = new Date(value);
  const differenceSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(differenceSeconds);
  if (absoluteSeconds < 5) {
    return "à l’instant";
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const calendarDayDifference = Math.round(
    (startOfDate.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (calendarDayDifference === -1) {
    return "hier";
  }

  const formatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "always" });
  if (absoluteSeconds < 60) {
    return formatter.format(differenceSeconds, "second");
  }
  const differenceMinutes = Math.round(differenceSeconds / 60);
  if (Math.abs(differenceMinutes) < 60) {
    return formatter.format(differenceMinutes, "minute");
  }
  const differenceHours = Math.round(differenceMinutes / 60);
  if (Math.abs(differenceHours) < 24) {
    return formatter.format(differenceHours, "hour");
  }
  const differenceDays = Math.round(differenceHours / 24);
  if (Math.abs(differenceDays) < 30) {
    return formatter.format(differenceDays, "day");
  }
  return formatDateTime(value);
}
