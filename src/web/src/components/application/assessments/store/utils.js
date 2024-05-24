import { isUndefined } from "lodash";
import moment from "moment";

export function weeksBetween(start, end) {
  if (isUndefined(start) || isUndefined(end)) return 0;

  const weeks = Math.ceil(
    moment
      .utc(end)
      .endOf("week")
      .diff(moment.utc(start).startOf("week"), "week", true)
  );

  if (weeks == 53) {
    const days = Math.ceil(moment.utc(end).diff(moment.utc(start), "days", true));
    if (days <= 366) return 52;
  }

  return weeks;
}

export function monthsBetween(start, end) {
  if (isUndefined(start) || isUndefined(end)) return 0;

  const months = Math.ceil(
    moment
      .utc(end)
      .endOf("month")
      .diff(moment.utc(start).startOf("month"), "month", true)
  );

  if (months == 13) {
    const days = Math.ceil(moment.utc(end).diff(moment.utc(start), "days", true));
    if (days <= 366) return 12;
  }

  return months;
}
