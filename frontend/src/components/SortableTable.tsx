import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface SortableColumn {
  key: string;
  label: string;
  /** If true, this column won't be formatted as currency */
  noFmt?: boolean;
  /** Custom render function */
  render?: (value: any, row: any) => React.ReactNode;
  /** Fixed width class */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

interface SortableTableProps {
  columns: SortableColumn[];
  data: any[];
  /** Intl formatter for currency columns */
  fmt?: Intl.NumberFormat;
  /** Keys that should NOT be formatted as currency even if numeric */
  rawNumberKeys?: string[];
  /** Keys that SHOULD be formatted as currency */
  currencyKeys?: string[];
  /** Extra class for the wrapper */
  className?: string;
  /** Extra class for the table */
  tableClassName?: string;
  /** Row size: compact or normal */
  size?: 'compact' | 'normal';
  /** Render an actions column at the end of each row */
  renderActions?: (row: any) => React.ReactNode;
}

export default function SortableTable({
  columns,
  data,
  fmt: fmtProp,
  rawNumberKeys = [],
  currencyKeys = [],
  className = '',
  tableClassName = '',
  size = 'normal',
  renderActions,
}: SortableTableProps) {
  const fmt = fmtProp || new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const py = size === 'compact' ? 'py-1.5' : 'py-2.5';
  const textSize = size === 'compact' ? 'text-[10px]' : 'text-[11px]';

  const defaultRawKeys = [
    'year', 'año', 'mes', 'añoMes', 'id_lote', 'lote', 'id', 'codigo', 'idUsuario',
    'cabezas', 'cantidad', 'cabezasGeneral', 'cabezasRegional', 'cabezasOfi',
    'cabzGenVenta', 'cabzGenCompra', 'cabInv', 'cabFaena', 'cabCria', 'cabMag',
    'cabzRegVenta', 'cabzRegCompra', 'cabzRegOfi', 'cabzOfiCompra',
    'tropas', 'tropasGeneral', 'tropasRegional', 'tropasOficina', 'opOficina',
    'categoria', 'category', 'kms', 'agentes', 'socOpGen', 'socOpOficina',
    ...rawNumberKeys
  ];

  const decimalPercentKeys = [
    'escalaGen', 'escalaOficina', 'escala_aplicada', 'bolsaRegion', 'tajadaRegion', 'pctMinimo'
  ];

  const wholePercentKeys = [
    'rendimiento', 'rendimientoGen', 'rendimiento_real', 'rendimiento_topeado', 'porcentaje'
  ];

  const formatValue = (val: any, col: SortableColumn, row: any) => {
    if (col.render) return col.render(val, row);
    if (val == null) return '-';
    if (typeof val === 'number') {
      const isCurrency = currencyKeys.includes(col.key);
      const isRaw = col.noFmt || defaultRawKeys.includes(col.key);
      const isDecimalPercent = decimalPercentKeys.includes(col.key);
      const isWholePercent = wholePercentKeys.includes(col.key);

      if (isDecimalPercent) {
        return `${(val * 100).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
      }
      if (isWholePercent) {
        return `${val.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
      }
      if (isRaw) {
        return val.toLocaleString('es-AR', { maximumFractionDigits: 0 });
      }
      if (isCurrency) {
        return fmt.format(val);
      }
      
      const lowerKey = col.key.toLowerCase();
      const isNotCurrency = 
        lowerKey.includes('id') || 
        lowerKey.includes('lote') || 
        lowerKey.includes('cantidad') || 
        lowerKey.includes('cabezas') || 
        lowerKey.includes('tropas') || 
        lowerKey.includes('categoria') || 
        lowerKey.includes('year') ||
        lowerKey.includes('año') ||
        lowerKey.includes('mes') ||
        lowerKey.includes('kms') ||
        lowerKey.includes('cant') ||
        lowerKey.includes('num');
        
      if (isNotCurrency) {
        return val.toLocaleString('es-AR', { maximumFractionDigits: 0 });
      }
      
      return fmt.format(val);
    }
    return val;
  };

  return (
    <div className={`rounded-xl border border-slate-100 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-left ${tableClassName}`}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-2 cursor-pointer select-none hover:text-slate-600 hover:bg-slate-100/60 transition-colors group ${col.width || ''} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <span className="inline-flex flex-col ml-0.5">
                      {sortKey === col.key ? (
                        sortDir === 'asc'
                          ? <ChevronUp size={10} className="text-blue-500" />
                          : <ChevronDown size={10} className="text-blue-500" />
                      ) : (
                        <ChevronsUpDown size={10} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                      )}
                    </span>
                  </span>
                </th>
              ))}
              {renderActions && (
                <th className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-2 text-center">Link</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, idx) => (
              <tr key={idx} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                {columns.map(col => (
                  <td key={col.key} className={`px-3 ${py} ${textSize} text-slate-700 font-medium ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}>
                    {formatValue(item[col.key], col, item)}
                  </td>
                ))}
                {renderActions && (
                  <td className={`px-3 ${py} ${textSize} text-center`}>{renderActions(item)}</td>
                )}
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-xs text-slate-400">Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
