'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('table', className)}>{children}</table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return <thead className={className}>{children}</thead>;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children?: ReactNode;
  className?: string;
}

export function TableHead({ children, className }: TableHeadProps) {
  return <th className={className}>{children}</th>;
}

interface TableCellProps {
  children?: ReactNode;
  className?: string;
}

export function TableCell({ children, className }: TableCellProps) {
  return <td className={className}>{children}</td>;
}

interface EmptyStateProps {
  message?: string;
  colSpan?: number;
}

export function TableEmpty({ message = 'No data found', colSpan = 5 }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8 text-surface-500">
        {message}
      </td>
    </tr>
  );
}

