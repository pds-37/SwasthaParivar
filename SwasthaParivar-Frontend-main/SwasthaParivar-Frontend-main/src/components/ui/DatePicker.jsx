import React from "react";
import { CalendarDays } from "lucide-react";

import Input from "./Input";

const DatePicker = React.forwardRef(({ leftIcon, ...props }, ref) => (
  <Input ref={ref} type="date" leftIcon={leftIcon ?? <CalendarDays size={18} />} {...props} />
));

DatePicker.displayName = "DatePicker";

export default DatePicker;
