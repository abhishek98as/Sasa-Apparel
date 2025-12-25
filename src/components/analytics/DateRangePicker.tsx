"use client";

import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
// Note: Assuming a Calendar component exists in ui/calendar, or we use a simple input for now to avoid huge dependency setup if missing.
// Using native date inputs for simplicity and robustness in this "little mistakes" context.

interface DateRangePickerProps {
    from: Date;
    to: Date;
    onUpdate: (range: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ from, to, onUpdate }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const presets = [
        { label: 'Last 7 Days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
        { label: 'Last 30 Days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
        { label: 'This Month', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
        { label: 'Last Month', getValue: () => ({ from: startOfMonth(subDays(new Date(), 30)), to: endOfMonth(subDays(new Date(), 30)) }) },
    ];

    return (
        <div className="flex items-center gap-2">
            <div className="grid gap-2">
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"secondary"}
                            className={cn(
                                "w-[260px] justify-start text-left font-normal",
                                !from && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {from ? (
                                to ? (
                                    <>
                                        {format(from, "LLL dd, y")} - {format(to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-2 flex-wrap">
                                {presets.map(preset => (
                                    <Button
                                        key={preset.label}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            onUpdate(preset.getValue());
                                            setIsOpen(false);
                                        }}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <div className="grid gap-1">
                                    <label className="text-xs">Start</label>
                                    <input
                                        type="date"
                                        className="border p-1 rounded"
                                        value={format(from, 'yyyy-MM-dd')}
                                        onChange={(e) => onUpdate({ from: new Date(e.target.value), to })}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-xs">End</label>
                                    <input
                                        type="date"
                                        className="border p-1 rounded"
                                        value={format(to, 'yyyy-MM-dd')}
                                        onChange={(e) => onUpdate({ from, to: new Date(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
