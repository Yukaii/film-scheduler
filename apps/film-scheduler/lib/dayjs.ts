  import dayjs from "dayjs";
  import "dayjs/locale/en";
  import timezone from "dayjs/plugin/timezone";
  import isBetween from "dayjs/plugin/isBetween";
  
  dayjs.extend(isBetween);
  dayjs.locale("en");
  dayjs.extend(timezone);
  
  dayjs.tz.setDefault("Asia/Taipei");
  

  const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];

  /** Traditional Chinese weekday for a date: "週一" … "週日" (or just "一" with `short`). */
  export function weekdayZh(date: dayjs.ConfigType, { short = false } = {}) {
    const day = WEEKDAYS_ZH[dayjs(date).day()];
    return short ? day : `週${day}`;
  }

  export default dayjs;