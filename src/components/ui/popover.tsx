"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified Popover Implementation
// Note: In a real project, we'd use @radix-ui/react-popover. 
// This is a minimal substitute to satisfy the build without installing packages.

const PopoverContext = React.createContext<{
    isOpen: boolean;
    setIsOpen: (v: boolean) => void
} | null>(null);

export const Popover = ({
    children,
    open,
    onOpenChange
}: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled && onOpenChange ? onOpenChange : setInternalOpen;

    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [setIsOpen]);

    return (
        <PopoverContext.Provider value={{ isOpen, setIsOpen }}>
            <div ref={containerRef} className="relative inline-block text-left">
                {children}
            </div>
        </PopoverContext.Provider>
    );
};

export const PopoverTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, asChild, ...props }, ref) => {
    const context = React.useContext(PopoverContext);
    return (
        <div onClick={(e) => {
            context?.setIsOpen(!context.isOpen);
            if (onClick) onClick(e as any);
        }}>
            {children}
        </div>
    )
});
PopoverTrigger.displayName = "PopoverTrigger";

export const PopoverContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end'; sideOffset?: number }
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
    const context = React.useContext(PopoverContext);
    if (!context?.isOpen) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 w-72 rounded-md border bg-white p-4 text-black shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 top-full mt-2",
                align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
                className
            )}
            {...props}
        />
    )
});
PopoverContent.displayName = "PopoverContent";
