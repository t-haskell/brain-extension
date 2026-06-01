import { addDays, addWeeks, format, setHours, setMinutes, startOfDay } from "date-fns";
import { formatDateTimeInput } from "../ui/date";

interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
}

const defaultTime = "09:00";

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5)
  };
}

function combineDateTime(date: string, time: string) {
  return date ? `${date}T${time || defaultTime}` : "";
}

function datePreset(daysFromToday: number) {
  const base = startOfDay(addDays(new Date(), daysFromToday));
  return formatDateTimeInput(setMinutes(setHours(base, 9), 0));
}

function nextWeekPreset() {
  const base = startOfDay(addWeeks(new Date(), 1));
  return formatDateTimeInput(setMinutes(setHours(base, 9), 0));
}

function todayDate() {
  return format(new Date(), "yyyy-MM-dd");
}

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const { date, time } = splitDateTime(value);

  function updateDate(nextDate: string) {
    onChange(combineDateTime(nextDate, time));
  }

  function updateTime(nextTime: string) {
    onChange(combineDateTime(date || todayDate(), nextTime));
  }

  return (
    <fieldset className="date-time-field">
      <legend>{label}</legend>
      <div className="date-input-grid">
        <label>
          Date
          <input type="date" value={date} onChange={(event) => updateDate(event.target.value)} />
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={(event) => updateTime(event.target.value)} />
        </label>
      </div>
      <div className="date-preset-row" aria-label={`${label} presets`}>
        <button type="button" onClick={() => onChange(datePreset(0))}>
          Today
        </button>
        <button type="button" onClick={() => onChange(datePreset(1))}>
          Tomorrow
        </button>
        <button type="button" onClick={() => onChange(nextWeekPreset())}>
          Next week
        </button>
        <button type="button" onClick={() => onChange("")}>
          Clear
        </button>
      </div>
      <div className="date-preset-row compact" aria-label={`${label} quick slots`}>
        <button type="button" onClick={() => updateTime("09:00")}>
          9 AM
        </button>
        <button type="button" onClick={() => updateTime("13:00")}>
          1 PM
        </button>
        <button type="button" onClick={() => updateTime("17:00")}>
          5 PM
        </button>
      </div>
    </fieldset>
  );
}
