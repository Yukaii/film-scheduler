  import dayjs from "dayjs";
  import "dayjs/locale/en";
  import timezone from "dayjs/plugin/timezone";
  import isBetween from "dayjs/plugin/isBetween";
  
  dayjs.extend(isBetween);
  dayjs.locale("en");
  dayjs.extend(timezone);
  
  dayjs.tz.setDefault("Asia/Taipei");
  

  export default dayjs;