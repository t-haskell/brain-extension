import { getDatePresetValue } from "../ui/date";

interface DateTimeFieldProps {
  label: string;
  value: string;
  timeZone: string;
  defaultTime: string;
  onChange(value: string): void;
}

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5)
  };
}

function combineDateTime(date: string, time: string, defaultTime: string) {
  return date ? `${date}T${time || defaultTime}` : "";
}

function todayDate(timeZone: string, defaultTime: string) {
  return getDatePresetValue(0, timeZone, defaultTime).slice(0, 10);
}

export function DateTimeField({ label, value, timeZone, defaultTime, onChange }: DateTimeFieldProps) {
  const { date, time } = splitDateTime(value);

  function updateDate(nextDate: string) {
    onChange(combineDateTime(nextDate, time, defaultTime));
  }

  function updateTime(nextTime: string) {
    onChange(combineDateTime(date || todayDate(timeZone, defaultTime), nextTime, defaultTime));
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
        <button type="button" onClick={() => onChange(getDatePresetValue(0, timeZone, defaultTime))}>
          Today
        </button>
        <button type="button" onClick={() => onChange(getDatePresetValue(1, timeZone, defaultTime))}>
          Tomorrow
        </button>
        <button type="button" onClick={() => onChange(getDatePresetValue(7, timeZone, defaultTime))}>
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
