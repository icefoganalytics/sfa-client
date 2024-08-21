import { isUndefined } from "lodash";
import moment from "moment";

export function weeksBetween(start, end) {
  if (isUndefined(start) || isUndefined(end)) return 0;

  const sDate = moment.utc(start).hours(12).minutes(0);
  const eDate = moment.utc(end).hours(12).minutes(0);
  const days = eDate.diff(sDate, "days");
  const weeks = Math.ceil(days / 7);

  if (weeks == 53 && days <= 366) return 52;

  return weeks;
}

export function monthsBetween(start, end) {
  if (isUndefined(start) || isUndefined(end)) return 0;

  const months = Math.ceil(
    moment.utc(end).endOf("month").add(1, "millisecond").diff(moment.utc(start).startOf("month"), "month", true)
  );

  if (months == 13) {
    const days = Math.ceil(moment.utc(end).diff(moment.utc(start), "days", true));
    if (days <= 366) return 12;
  }

  return months;
}
