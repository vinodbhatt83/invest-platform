import React from 'react';
import { twMerge } from 'tailwind-merge';

interface Column<T> {
    header: React.ReactNode;
    accessor: keyof T | ((row: T) => React.ReactNode);
    className?: string;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string | number;
    isLoading?: boolean;
    emptyState?: React.ReactNode;
    onRowClick?: (item: T) => void;
    className?: string;
    striped?: boolean;
    hoverable?: boolean;
    compact?: boolean;
    bordered?: boolean;
}

function Table<T>({
    data,
    columns,
    keyExtractor,
    isLoading = false,
    emptyState,
    onRowClick,
    className,
    striped = true,
    hoverable = true,
    compact = false,
    bordered = true,
}: TableProps<T>) {
    const renderCell = (row: T, column: Column<T>) => {
        if (typeof column.accessor === 'function') {
            return column.accessor(row);
        }
        return row[column.accessor] as React.ReactNode;
    };

    const tableClasses = twMerge(
        'w-full table-auto',
        bordered ? 'border-collapse border border-gray-200' : '',
        className
    );

    const thClasses = twMerge(
        'text-left py-3 px-4 font-medium text-gray-700 bg-gray-50',
        bordered ? 'border border-gray-200' : 'border-b-2 border-gray-200',
    );

    const tdClasses = (index: number) => twMerge(
        'py-3 px-4',
        bordered ? 'border border-gray-200' : '',
        striped && index % 2 !== 0 ? 'bg-gray-50' : '',
    );

    const trClasses = twMerge(
        hoverable ? 'hover:bg-gray-100 transition-colors duration-150' : '',
        onRowClick ? 'cursor-pointer' : '',
        compact ? 'h-10' : 'h-14'
    );

    if (isLoading) {
        return (
            <div className="w-full flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (data.length === 0 && emptyState) {
        return <div className="w-full py-8">{emptyState}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className={tableClasses}>
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={`header-${index}`}
                                className={twMerge(thClasses, column.className)}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr
                            key={keyExtractor(row)}
                            className={trClasses}
                            onClick={() => onRowClick && onRowClick(row)}
                        >
                            {columns.map((column, colIndex) => (
                                <td
                                    key={`cell-${rowIndex}-${colIndex}`}
                                    className={twMerge(tdClasses(rowIndex), column.className)}
                                >
                                    {renderCell(row, column)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Table;