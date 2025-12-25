"use client";

import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  presets?: boolean;
}

export function DateRangeFilter({ dateRange, onDateRangeChange, presets = true }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: 'Today',
      value: 'today',
      getRange: () => ({
        from: new Date(),
        to: new Date()
      })
    },
    {
      label: 'Last 7 Days',
      value: '7d',
      getRange: () => ({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      })
    },
    {
      label: 'Last 30 Days',
      value: '30d',
      getRange: () => ({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      })
    },
    {
      label: 'Month to Date',
      value: 'mtd',
      getRange: () => ({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date()
      })
    },
    {
      label: 'Year to Date',
      value: 'ytd',
      getRange: () => ({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date()
      })
    }
  ];

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    onDateRangeChange(preset.getRange());
    setIsOpen(false);
  };

  return (
    <div className="flex gap-2">
      {presets && (
        <div className="flex gap-1">
          {presetRanges.map(preset => (
            <Button
              key={preset.value}
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "text-xs",
                dateRange?.from && dateRange?.to &&
                format(dateRange.from, 'yyyy-MM-dd') === format(preset.getRange().from!, 'yyyy-MM-dd') &&
                "bg-primary text-primary-foreground"
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
