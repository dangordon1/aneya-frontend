import { TransposedTable } from '../doctor-report-card/TransposedTable';

interface TableColumn {
  header: string;
  key: string;
  type?: string;
  unit?: string;
}

interface PdfTableRendererProps {
  columns: TableColumn[];
  data: Record<string, any>[];
  transposed?: boolean;
  title?: string;
}

export function PdfTableRenderer({
  columns,
  data,
  transposed = false,
  title
}: PdfTableRendererProps) {
  // Use transposed layout for wide tables (more than 6 columns) or explicitly requested
  const useTransposed = transposed || columns.length > 6;

  if (useTransposed) {
    return (
      <div className="mb-6 avoid-break">
        {title && (
          <h4 className="text-[var(--medical-navy)] mb-3 font-semibold">{title}</h4>
        )}
        <TransposedTable columns={columns} data={data} />
      </div>
    );
  }

  // Regular table layout
  return (
    <div className="mb-6 avoid-break">
      {title && (
        <h4 className="text-[var(--medical-navy)] mb-3 font-semibold">{title}</h4>
      )}
      <div className="overflow-x-auto border border-[var(--medical-navy)] rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--medical-navy)] text-white">
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className="px-4 py-2 text-left text-sm font-semibold"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-3 text-center text-gray-500 italic"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={rowIdx % 2 === 0 ? 'bg-[var(--medical-cream)]' : 'bg-white'}
                >
                  {columns.map((column, colIdx) => {
                    const value = row[column.key];
                    const formattedValue = formatCellValue(value, column);

                    return (
                      <td
                        key={colIdx}
                        className="px-4 py-2 text-sm border-l border-[var(--medical-navy)]/20"
                      >
                        {formattedValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Format cell value based on column type and unit
 */
function formatCellValue(value: any, column: TableColumn): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle numbers with units
  if (column.type === 'number' && column.unit) {
    return `${value} ${column.unit}`;
  }

  // Handle dates
  if (column.type === 'date') {
    try {
      const date = new Date(value);
      return date.toLocaleDateString();
    } catch {
      return value.toString();
    }
  }

  return value.toString();
}
