"use client";

import * as React from "react";
import { parseDate } from "chrono-node";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DateTimeLanguagePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}

export function DateTimeLanguagePicker({
  value: propValue,
  onChange,
}: DateTimeLanguagePickerProps = {}) {
  const [value, setValue] = React.useState("");
  const [date, setDate] = React.useState<Date | undefined>(propValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date | undefined>(propValue);
  const [showPreview, setShowPreview] = React.useState(false);
  const [isUserTyping, setIsUserTyping] = React.useState(false);

  React.useEffect(() => {
    // Only update the input value from prop if user is not actively typing
    if (propValue && !isUserTyping) {
      setDate(propValue);
      setMonth(propValue);
    }
  }, [propValue, isUserTyping]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (date) {
        newDate.setHours(date.getHours());
        newDate.setMinutes(date.getMinutes());
      }
      setDate(newDate);
      setMonth(newDate);
      setValue(format(newDate, "MMMM d, yyyy 'at' h:mm a"));
      setShowPreview(false);
      setIsUserTyping(false);
      onChange?.(newDate);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    const newDate = date ? new Date(date) : new Date();
    if (type === "hour") {
      newDate.setHours(parseInt(value));
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value));
    }
    setDate(newDate);
    setMonth(newDate);
    setValue(format(newDate, "MMMM d, yyyy 'at' h:mm a"));
    setShowPreview(false);
    setIsUserTyping(false);
    onChange?.(newDate);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setValue(inputValue); // Keep the user's typed text as-is
    setIsUserTyping(true);

    if (inputValue.trim()) {
      const parsedDate = parseDate(inputValue);
      if (parsedDate) {
        setDate(parsedDate);
        setMonth(parsedDate);
        setShowPreview(true);
        onChange?.(parsedDate);
      } else {
        setShowPreview(false);
        setDate(undefined);
        onChange?.(undefined);
      }
    } else {
      setShowPreview(false);
      setDate(undefined);
      onChange?.(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="relative flex w-full">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder="Tomorrow at 3pm, next Monday, in 2 hours..."
          className="pr-9"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-px top-px h-[calc(100%-2px)] rounded-l-none rounded-r-[calc(var(--radius)-1px)] px-2.5 hover:bg-transparent"
              />
            }
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="sr-only">Open date time picker</span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="sm:flex">
              <Calendar
                mode="single"
                selected={date}
                month={month}
                onMonthChange={setMonth}
                onSelect={handleDateSelect}
                initialFocus
              />
              <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                <ScrollArea className="w-64 sm:w-auto">
                  <div className="flex sm:flex-col p-2">
                    {hours.map((hour) => (
                      <Button
                        key={hour}
                        size="icon"
                        variant={
                          date && date.getHours() === hour ? "default" : "ghost"
                        }
                        className="sm:w-full shrink-0 aspect-square"
                        onClick={() =>
                          handleTimeChange("hour", hour.toString())
                        }
                      >
                        {hour.toString().padStart(2, "0")}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="sm:hidden" />
                </ScrollArea>
                <ScrollArea className="w-64 sm:w-auto">
                  <div className="flex sm:flex-col p-2">
                    {Array.from({ length: 12 }, (_, i) => i * 5).map(
                      (minute) => (
                        <Button
                          key={minute}
                          size="icon"
                          variant={
                            date && date.getMinutes() === minute
                              ? "default"
                              : "ghost"
                          }
                          className="sm:w-full shrink-0 aspect-square"
                          onClick={() =>
                            handleTimeChange("minute", minute.toString())
                          }
                        >
                          {minute.toString().padStart(2, "0")}
                        </Button>
                      ),
                    )}
                  </div>
                  <ScrollBar orientation="horizontal" className="sm:hidden" />
                </ScrollArea>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {showPreview && date && (
        <div className="text-sm text-muted-foreground px-1">
          <span className="font-medium">
            {format(date, "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      )}
    </div>
  );
}
