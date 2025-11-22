import React, { useState, useEffect } from 'react';
import { useModal } from '../../hooks/useModal.tsx';
import { supabaseService } from '../../services/supabaseService';
import { supabase } from '../../db/supabase.js';
import ExcelJS from 'exceljs';

type HistorialProducto = {
  nombre: string;
  cantidad: number;
  precio: number;
};

type HistorialServicio = {
  nombre: string;
  duracion?: number | null;
  precio: number;
};

type HistorialItem = {
  id: string;
  descripcion: string;
  fecha: string;
  monto: number;
  tipo: string;
  cliente: string | null;
  proveedor: string | null;
  barbero: string | null;
  factura: string | null;
  metodoPago: string | null;
  productos: HistorialProducto[];
  servicios: HistorialServicio[];
  notas: string | null;
  categoria: string | null;
};

const Historial = () => {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [filteredHistorial, setFilteredHistorial] = useState<HistorialItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<HistorialItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<{
    concepto: string;
    monto: string;
    categoria: string;
    fecha: string;
    notas: string;
  }>({
    concepto: '',
    monto: '',
    categoria: 'other',
    fecha: new Date().toISOString().split('T')[0],
    notas: '',
  });
  
  const { showInfoModal, ModalComponent } = useModal();

  const transactionTypes = [
    { value: 'all', label: 'Todos', color: 'slate' },
    { value: 'venta', label: 'Ventas', color: 'green' },
    { value: 'servicio', label: 'Servicios', color: 'blue' },
    { value: 'gasto', label: 'Gastos', color: 'red' },
    { value: 'ingreso_extra', label: 'Ingresos Extra', color: 'purple' },
    { value: 'devolucion', label: 'Devoluciones', color: 'orange' }
  ];

  const dateFilters = [
    { value: 'all', label: 'Todo el tiempo' },
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Rango personalizado' }
  ];

  useEffect(() => {
    loadHistorial();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('historial-admin-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'historial_admin',
        },
        () => {
          void loadHistorial();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterHistorial();
  }, [historial, searchTerm, typeFilter, dateFilter, startDate, endDate]);

  const normalizeHistorialItem = (row: Record<string, unknown>, index: number): HistorialItem => {
    const rawId = (row.id ?? row.uuid ?? row.created_at ?? `historial-${index}`) as string | number;
    const safeString = (value: unknown, fallback = ''): string => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
      if (value instanceof Date) return value.toISOString();
      return fallback;
    };

    const toNumber = (value: unknown, fallback = 0): number => {
      const num = typeof value === 'string' ? Number(value) : value;
      return typeof num === 'number' && !Number.isNaN(num) ? num : fallback;
    };

    const toProductArray = (value: unknown): HistorialProducto[] => {
      if (!Array.isArray(value)) return [];
      return value.map((producto) => {
        if (producto && typeof producto === 'object') {
          const item = producto as Record<string, unknown>;
          return {
            nombre: safeString(item.nombre, 'Producto'),
            cantidad: toNumber(item.cantidad, 1),
            precio: toNumber(item.precio ?? item.precio_unitario ?? item.total, 0),
          };
        }
        return {
          nombre: 'Producto',
          cantidad: 1,
          precio: 0,
        };
      });
    };

    const toServiceArray = (value: unknown): HistorialServicio[] => {
      if (!Array.isArray(value)) return [];
      return value.map((servicio) => {
        if (servicio && typeof servicio === 'object') {
          const item = servicio as Record<string, unknown>;
          return {
            nombre: safeString(item.nombre, 'Servicio'),
            duracion: toNumber(item.duracion ?? item.duracion_minutos, null as unknown as number),
            precio: toNumber(item.precio ?? item.precio_cobrado, 0),
          };
        }
        return {
          nombre: 'Servicio',
          duracion: null,
          precio: 0,
        };
      });
    };

    const fecha = safeString(row.fecha ?? row.created_at, new Date().toISOString());

    return {
      id: String(rawId),
      descripcion: safeString(row.descripcion ?? row.description, 'Transacción'),
      fecha,
      monto: toNumber(row.monto ?? row.amount, 0),
      tipo: safeString(row.tipo ?? row.type, 'otro') || 'otro',
      cliente: safeString(row.cliente ?? row.cliente_nombre ?? row.customer_name, '').trim() || null,
      proveedor: safeString(row.proveedor ?? row.proveedor_nombre ?? row.supplier_name, '').trim() || null,
      barbero: safeString(row.barbero ?? row.barbero_nombre ?? row.staff_name, '').trim() || null,
      factura: safeString(row.factura ?? row.invoice, '').trim() || null,
      metodoPago: safeString(row.metodo_pago ?? row.payment_method, '').trim() || null,
      productos: toProductArray(row.productos),
      servicios: toServiceArray(row.servicios),
      notas: safeString(row.notas ?? row.notes, '').trim() || null,
      categoria: safeString(row.categoria ?? row.category, '').trim() || null,
    };
  };

  const loadHistorial = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabaseService.getHistorial();

      if (error) {
        setError(error || 'Error al cargar el historial');
        return;
      }

      const normalized = (data ?? []).map((row, index) =>
        normalizeHistorialItem(row as Record<string, unknown>, index),
      );
      setHistorial(normalized);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const filterHistorial = () => {
    let filtered = historial;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barbero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.factura?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.tipo === typeFilter);
    }

    // Filtrar por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.fecha);
        
        switch (dateFilter) {
          case 'today':
            return itemDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            return itemDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            return itemDate >= yearAgo;
          case 'custom':
            if (startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              return itemDate >= start && itemDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Ordenar por fecha (más reciente primero)
    filtered.sort((a, b) => {
      const timeB = new Date(b.fecha).getTime();
      const timeA = new Date(a.fecha).getTime();
      return timeB - timeA;
    });

    setFilteredHistorial(filtered);
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(0);
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStats = () => {
    const totalIngresos = filteredHistorial
      .filter(item => ['venta', 'servicio', 'ingreso_extra'].includes(item.tipo))
      .reduce((sum, item) => sum + Math.abs(item.monto), 0);

    const totalGastos = filteredHistorial
      .filter(item => ['gasto', 'devolucion'].includes(item.tipo))
      .reduce((sum, item) => sum + Math.abs(item.monto), 0);

    const gananciaTotal = totalIngresos - totalGastos;

    return {
      totalIngresos,
      totalGastos,
      gananciaTotal,
      totalTransacciones: filteredHistorial.length,
    };
  };

  const stats = getStats();

  const handleExport = async () => {
    try {
      if (!filteredHistorial.length) {
        showInfoModal(
          'Sin datos para exportar',
          'No hay registros en el historial con los filtros actuales.',
        );
        return;
      }

      // Paleta de colores del panel JP Barber (Tailwind)
      const COLOR_PRIMARY = 'FFEF4444'; // red-500
      const COLOR_PRIMARY_DARK = 'FFDC2626'; // red-600
      const COLOR_PRIMARY_DARKER = 'FFB91C1C'; // red-700
      const COLOR_PRIMARY_LIGHT = 'FFFECACA'; // red-100
      const COLOR_BG_DARK = 'FF111827'; // gray-900
      const COLOR_BG_MEDIUM = 'FF1F2937'; // gray-800
      const COLOR_BG_LIGHT = 'FF374151'; // gray-700
      const COLOR_ROW_ALT = 'FFF9FAFB'; // gray-50
      const COLOR_ROW_BASE = 'FFFFFFFF';
      const COLOR_BORDER = 'FFE5E7EB'; // gray-200
      const COLOR_TEXT_DARK = 'FF111827'; // gray-900
      const COLOR_TEXT_MEDIUM = 'FF6B7280'; // gray-500
      const COLOR_TEXT_LIGHT = 'FF9CA3AF'; // gray-400
      const COLOR_TEXT_WHITE = 'FFFFFFFF';
      const COLOR_GREEN = 'FF10B981'; // emerald-500
      const COLOR_GREEN_LIGHT = 'FFD1FAE5'; // emerald-100
      const COLOR_RED = 'FFEF4444'; // red-500
      const COLOR_RED_LIGHT = 'FFFEE2E2'; // red-100
      const COLOR_BLUE = 'FF3B82F6'; // blue-500
      const COLOR_PURPLE = 'FFA855F7'; // purple-500
      const COLOR_ORANGE = 'FFF97316'; // orange-500

      const workbook = new ExcelJS.Workbook();

      // === Hoja de Resumen ===
      const resumenSheet = workbook.addWorksheet('Resumen', {
        properties: { defaultRowHeight: 18 },
        pageSetup: { paperSize: 9, orientation: 'portrait' },
      });

      resumenSheet.columns = [
        { header: '', key: 'col1', width: 30 },
        { header: '', key: 'col2', width: 20 },
      ];

      // Título principal con diseño del panel
      resumenSheet.mergeCells('A1:B1');
      const titleCell = resumenSheet.getCell('A1');
      titleCell.value = 'Historial JP Barber';
      titleCell.font = { 
        name: 'Segoe UI', 
        size: 20, 
        bold: true, 
        color: { argb: COLOR_TEXT_WHITE } 
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'gradient',
        gradient: 'angle',
        degree: 90,
        stops: [
          { position: 0, color: { argb: COLOR_PRIMARY } },
          { position: 1, color: { argb: COLOR_PRIMARY_DARK } },
        ],
      };
      titleCell.border = {
        bottom: { style: 'medium', color: { argb: COLOR_PRIMARY_DARKER } },
      };
      resumenSheet.getRow(1).height = 40;

      // Freeze panes después del título
      resumenSheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];

      // Info general
      const rangoFecha = (() => {
        if (dateFilter === 'custom' && startDate && endDate) {
          return `${startDate} a ${endDate}`;
        }
        const label = dateFilters.find((f) => f.value === dateFilter)?.label;
        return label ?? 'Todo el tiempo';
      })();

      resumenSheet.getRow(2).height = 10;

      resumenSheet.getCell('A3').value = 'Generado el';
      resumenSheet.getCell('A3').font = { 
        name: 'Segoe UI', 
        size: 10, 
        bold: true, 
        color: { argb: COLOR_TEXT_MEDIUM } 
      };
      resumenSheet.getCell('A3').alignment = { vertical: 'middle' };
      resumenSheet.getCell('A3').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_ROW_ALT },
      };
      resumenSheet.getCell('B3').value = new Date();
      resumenSheet.getCell('B3').numFmt = 'dd/mm/yyyy hh:mm';
      resumenSheet.getCell('B3').font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXT_DARK } };
      resumenSheet.getCell('B3').alignment = { vertical: 'middle', horizontal: 'right' };
      resumenSheet.getCell('B3').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_ROW_ALT },
      };

      resumenSheet.getCell('A4').value = 'Rango de fechas';
      resumenSheet.getCell('A4').font = { 
        name: 'Segoe UI', 
        size: 10, 
        bold: true, 
        color: { argb: COLOR_TEXT_MEDIUM } 
      };
      resumenSheet.getCell('A4').alignment = { vertical: 'middle' };
      resumenSheet.getCell('B4').value = rangoFecha;
      resumenSheet.getCell('B4').font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXT_DARK } };
      resumenSheet.getCell('B4').alignment = { vertical: 'middle', horizontal: 'right' };

      resumenSheet.getRow(5).height = 12;

      // Métricas principales con diseño del panel
      let currentRow = 6;
      resumenSheet.getCell(`A${currentRow}`).value = 'Métrica';
      resumenSheet.getCell(`B${currentRow}`).value = 'Valor';
      
      // Aplicar estilo solo a celdas A6 y B6
      ['A', 'B'].forEach(col => {
        const cell = resumenSheet.getCell(`${col}${currentRow}`);
        cell.font = { 
          name: 'Segoe UI', 
          size: 11, 
          bold: true, 
          color: { argb: COLOR_TEXT_WHITE } 
        };
        cell.alignment = { horizontal: col === 'A' ? 'left' : 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLOR_BG_DARK },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: COLOR_PRIMARY } },
          bottom: { style: 'medium', color: { argb: COLOR_PRIMARY } },
        };
      });
      resumenSheet.getRow(currentRow).height = 30;

      const metrics = [
        ['Total Ingresos', stats.totalIngresos],
        ['Total Gastos', stats.totalGastos],
        ['Ganancia Total', stats.gananciaTotal],
      ];

      metrics.forEach(([label, value], idx) => {
        currentRow += 1;
        const row = resumenSheet.getRow(currentRow);
        row.values = [label, value];
        row.height = 24;
        
        const labelCell = row.getCell(1);
        labelCell.font = { 
          name: 'Segoe UI', 
          size: 10, 
          bold: true, 
          color: { argb: COLOR_TEXT_DARK } 
        };
        labelCell.alignment = { vertical: 'middle' };
        
        const valueCell = row.getCell(2);
        if (typeof value === 'number') {
          valueCell.numFmt = '"$" #,##0';
          valueCell.font = { 
            name: 'Segoe UI', 
            size: 11, 
            bold: true,
            color: { argb: idx === 2 ? (value >= 0 ? COLOR_GREEN : COLOR_RED) : COLOR_TEXT_DARK }
          };
          valueCell.alignment = { vertical: 'middle', horizontal: 'right' };
          
          if (idx === 0) {
            valueCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: COLOR_GREEN_LIGHT },
            };
          } else if (idx === 1) {
            valueCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: COLOR_RED_LIGHT },
            };
          }
        }
        
        row.eachCell((cell) => {
          cell.border = {
            bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
          };
        });
      });

      currentRow += 1;
      resumenSheet.getCell(`A${currentRow}`).value = 'Total Transacciones';
      resumenSheet.getCell(`B${currentRow}`).value = stats.totalTransacciones;
      resumenSheet.getRow(currentRow).height = 24;
      resumenSheet.getCell(`A${currentRow}`).font = { 
        name: 'Segoe UI', 
        size: 10, 
        bold: true, 
        color: { argb: COLOR_TEXT_DARK } 
      };
      resumenSheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle' };
      resumenSheet.getCell(`B${currentRow}`).font = { 
        name: 'Segoe UI', 
        size: 11, 
        bold: true, 
        color: { argb: COLOR_BG_DARK } 
      };
      resumenSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'right' };
      ['A', 'B'].forEach(col => {
        resumenSheet.getCell(`${col}${currentRow}`).border = {
          bottom: { style: 'medium', color: { argb: COLOR_PRIMARY_DARK } },
        };
      });

      // Estadísticas adicionales
      currentRow += 2;
      resumenSheet.getCell(`A${currentRow}`).value = 'Promedio por Transacción';
      const promedioTx = stats.totalTransacciones > 0 
        ? (stats.totalIngresos - stats.totalGastos) / stats.totalTransacciones 
        : 0;
      resumenSheet.getCell(`B${currentRow}`).value = promedioTx;
      resumenSheet.getCell(`B${currentRow}`).numFmt = '"$" #,##0';
      resumenSheet.getCell(`A${currentRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_TEXT_DARK } };
      resumenSheet.getCell(`B${currentRow}`).font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXT_MEDIUM } };
      resumenSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'right' };
      resumenSheet.getRow(currentRow).height = 22;
      
      currentRow += 1;
      resumenSheet.getCell(`A${currentRow}`).value = 'Margen de Ganancia';
      const margen = stats.totalIngresos > 0 
        ? ((stats.totalIngresos - stats.totalGastos) / stats.totalIngresos) * 100 
        : 0;
      resumenSheet.getCell(`B${currentRow}`).value = `${margen.toFixed(1)}%`;
      resumenSheet.getCell(`A${currentRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_TEXT_DARK } };
      resumenSheet.getCell(`B${currentRow}`).font = { 
        name: 'Segoe UI', 
        size: 10, 
        bold: true,
        color: { argb: margen >= 0 ? COLOR_GREEN : COLOR_RED } 
      };
      resumenSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'right' };
      resumenSheet.getRow(currentRow).height = 22;

      // Detalle de ingresos por tipo
      const ingresosPorTipo = new Map<string, number>();
      filteredHistorial.forEach((item) => {
        if (['venta', 'servicio', 'ingreso_extra'].includes(item.tipo)) {
          const key = getTypeLabel(item.tipo);
          const actual = ingresosPorTipo.get(key) ?? 0;
          ingresosPorTipo.set(key, actual + Math.abs(item.monto));
        }
      });

      if (ingresosPorTipo.size > 0) {
        currentRow += 2;
        resumenSheet.getCell(`A${currentRow}`).value = 'Ingresos por tipo';
        resumenSheet.getCell(`B${currentRow}`).value = 'Monto';
        
        ['A', 'B'].forEach(col => {
          const cell = resumenSheet.getCell(`${col}${currentRow}`);
          cell.font = { 
            name: 'Segoe UI', 
            size: 11, 
            bold: true, 
            color: { argb: COLOR_TEXT_WHITE } 
          };
          cell.alignment = { horizontal: col === 'A' ? 'left' : 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLOR_BG_DARK },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: COLOR_PRIMARY } },
            bottom: { style: 'medium', color: { argb: COLOR_PRIMARY } },
          };
        });
        resumenSheet.getRow(currentRow).height = 28;

        ingresosPorTipo.forEach((valor, tipo) => {
          currentRow += 1;
          const row = resumenSheet.getRow(currentRow);
          row.values = [tipo, valor];
          row.height = 22;
          row.getCell(1).font = { 
            name: 'Segoe UI', 
            size: 10, 
            color: { argb: COLOR_TEXT_MEDIUM } 
          };
          row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
          row.getCell(2).numFmt = '"$" #,##0';
          row.getCell(2).font = { 
            name: 'Segoe UI', 
            size: 10, 
            bold: true, 
            color: { argb: COLOR_GREEN } 
          };
          row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
          row.eachCell((cell) => {
            cell.border = {
              bottom: { style: 'hair', color: { argb: COLOR_BORDER } },
            };
          });
        });
      }

      // Detalle de gastos por categoría
      const gastosPorCategoria = new Map<string, number>();
      filteredHistorial.forEach((item) => {
        if (['gasto', 'devolucion'].includes(item.tipo)) {
          const categoria = item.categoria || 'Sin categoría';
          const actual = gastosPorCategoria.get(categoria) ?? 0;
          gastosPorCategoria.set(categoria, actual + Math.abs(item.monto));
        }
      });

      if (gastosPorCategoria.size > 0) {
        currentRow += 2;
        resumenSheet.getCell(`A${currentRow}`).value = 'Gastos por categoría';
        resumenSheet.getCell(`B${currentRow}`).value = 'Monto';
        
        ['A', 'B'].forEach(col => {
          const cell = resumenSheet.getCell(`${col}${currentRow}`);
          cell.font = { 
            name: 'Segoe UI', 
            size: 11, 
            bold: true, 
            color: { argb: COLOR_TEXT_WHITE } 
          };
          cell.alignment = { horizontal: col === 'A' ? 'left' : 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLOR_BG_DARK },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: COLOR_PRIMARY } },
            bottom: { style: 'medium', color: { argb: COLOR_PRIMARY } },
          };
        });
        resumenSheet.getRow(currentRow).height = 28;

        gastosPorCategoria.forEach((valor, categoria) => {
          currentRow += 1;
          const row = resumenSheet.getRow(currentRow);
          row.values = [categoria, valor];
          row.height = 22;
          row.getCell(1).font = { 
            name: 'Segoe UI', 
            size: 10, 
            color: { argb: COLOR_TEXT_MEDIUM } 
          };
          row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
          row.getCell(2).numFmt = '"$" #,##0';
          row.getCell(2).font = { 
            name: 'Segoe UI', 
            size: 10, 
            bold: true, 
            color: { argb: COLOR_RED } 
          };
          row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
          row.eachCell((cell) => {
            cell.border = {
              bottom: { style: 'hair', color: { argb: COLOR_BORDER } },
            };
          });
        });
      }

      // === Hoja de Transacciones con diseño moderno ===
      const transSheet = workbook.addWorksheet('Transacciones', {
        properties: { defaultRowHeight: 22 },
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      transSheet.columns = [
        { header: 'ID', key: 'id', width: 12 },
        { header: 'Fecha', key: 'fecha', width: 18 },
        { header: 'Tipo', key: 'tipo', width: 14 },
        { header: 'Descripción', key: 'descripcion', width: 35 },
        { header: 'Cliente/Proveedor', key: 'clienteProveedor', width: 22 },
        { header: 'Barbero', key: 'barbero', width: 20 },
        { header: 'Monto', key: 'monto', width: 16 },
        { header: 'Método de Pago', key: 'metodoPago', width: 16 },
        { header: 'Categoría', key: 'categoria', width: 18 },
        { header: 'Factura', key: 'factura', width: 16 },
        { header: 'Productos', key: 'productos', width: 35 },
        { header: 'Servicios', key: 'servicios', width: 30 },
        { header: 'Notas', key: 'notas', width: 35 },
      ];

      const headerRow = transSheet.getRow(1);
      headerRow.font = { 
        name: 'Segoe UI', 
        size: 10, 
        bold: true, 
        color: { argb: COLOR_TEXT_WHITE } 
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_BG_DARK },
      };
      headerRow.height = 40;
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: COLOR_PRIMARY } },
          bottom: { style: 'medium', color: { argb: COLOR_PRIMARY } },
        };
      });

      // Freeze panes en encabezado de Transacciones
      transSheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];

      const tipoColorMap: Record<string, string> = {
        venta: COLOR_GREEN,
        servicio: COLOR_BLUE,
        gasto: COLOR_RED,
        ingreso_extra: COLOR_PURPLE,
        devolucion: COLOR_ORANGE,
      };

      filteredHistorial.forEach((item) => {
        // Formatear productos
        let productosText = '';
        if (item.productos && item.productos.length > 0) {
          productosText = item.productos
            .map((p) => `${p.nombre} x${p.cantidad} ($${(p.precio * p.cantidad).toLocaleString('es-CO')})`)
            .join('; ');
        }

        // Formatear servicios
        let serviciosText = '';
        if (item.servicios && item.servicios.length > 0) {
          serviciosText = item.servicios
            .map((s) => `${s.nombre} (${s.duracion || 0}min, $${s.precio.toLocaleString('es-CO')})`)
            .join('; ');
        }

        // Asegurar que los gastos tengan monto negativo
        let montoFinal = Number(item.monto ?? 0) || 0;
        // Si es gasto o devolución y el monto es positivo, hacerlo negativo
        if (['gasto', 'devolucion'].includes(item.tipo) && montoFinal > 0) {
          montoFinal = -montoFinal;
        }

        const row = transSheet.addRow({
          id: item.id ?? '',
          fecha: new Date(item.fecha),
          tipo: getTypeLabel(item.tipo),
          descripcion: item.descripcion,
          clienteProveedor: item.cliente ?? item.proveedor ?? '-',
          barbero: item.barbero ?? '',
          monto: montoFinal,
          metodoPago: item.metodoPago ?? '',
          categoria: item.categoria ?? '',
          factura: item.factura ?? '',
          productos: productosText,
          servicios: serviciosText,
          notas: item.notas ?? '',
        });

        const idCell = row.getCell('id');
        const fechaCell = row.getCell('fecha');
        const montoCell = row.getCell('monto');
        const tipoCell = row.getCell('tipo');
        const descripcionCell = row.getCell('descripcion');
        const productosCell = row.getCell('productos');
        const serviciosCell = row.getCell('servicios');
        const notasCell = row.getCell('notas');

        // ID
        idCell.font = { name: 'Segoe UI', size: 9, color: { argb: COLOR_TEXT_MEDIUM } };
        idCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Fecha
        if (fechaCell.value instanceof Date) {
          fechaCell.numFmt = 'dd/mm/yyyy hh:mm';
          fechaCell.font = { name: 'Segoe UI', size: 9 };
          fechaCell.alignment = { vertical: 'middle' };
        }
        
        // Monto
        if (typeof montoCell.value === 'number') {
          montoCell.numFmt = '"+$" #,##0;"-$" #,##0';
          const isPositive = (montoCell.value as number) >= 0;
          montoCell.font = {
            name: 'Segoe UI',
            size: 10,
            color: { argb: isPositive ? COLOR_GREEN : COLOR_RED },
            bold: true,
          };
          montoCell.alignment = { vertical: 'middle', horizontal: 'right' };
        }

        // Tipo
        if (typeof tipoCell.value === 'string') {
          const tipoKey = item.tipo;
          const color = tipoColorMap[tipoKey] ?? COLOR_TEXT_DARK;
          tipoCell.font = { 
            name: 'Segoe UI', 
            size: 9, 
            bold: true, 
            color: { argb: color } 
          };
          tipoCell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        
        // Descripción, Productos, Servicios, Notas con wrap
        descripcionCell.font = { name: 'Segoe UI', size: 9 };
        descripcionCell.alignment = { vertical: 'top', wrapText: true };
        
        productosCell.font = { name: 'Segoe UI', size: 9, color: { argb: COLOR_TEXT_MEDIUM } };
        productosCell.alignment = { vertical: 'top', wrapText: true };
        
        serviciosCell.font = { name: 'Segoe UI', size: 9, color: { argb: COLOR_TEXT_MEDIUM } };
        serviciosCell.alignment = { vertical: 'top', wrapText: true };
        
        notasCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: COLOR_TEXT_LIGHT } };
        notasCell.alignment = { vertical: 'top', wrapText: true };
        
        // Aplicar fuente base a todas las celdas restantes
        row.eachCell((cell, colNumber) => {
          if (!cell.font || !cell.font.name) {
            cell.font = { name: 'Segoe UI', size: 9 };
          }
          if (!cell.alignment) {
            cell.alignment = { vertical: 'middle' };
          }
        });
      });

      // Zebra rows con bordes sutiles
      transSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }
        
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowNumber % 2 === 0 ? COLOR_ROW_ALT : COLOR_ROW_BASE },
        };
        
        row.eachCell((cell) => {
          cell.border = {
            bottom: { style: 'hair', color: { argb: COLOR_BORDER } },
          };
        });
      });

      // AutoFilter
      transSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 13 },
      };

      // Fila de totales al final
      const lastRow = transSheet.rowCount + 1;
      transSheet.getCell(`A${lastRow}`).value = 'TOTALES';
      transSheet.getCell(`A${lastRow}`).font = { 
        name: 'Segoe UI', 
        size: 10, 
        bold: true, 
        color: { argb: COLOR_TEXT_WHITE } 
      };
      transSheet.getCell(`A${lastRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_BG_DARK },
      };
      transSheet.getCell(`A${lastRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Total de monto (aplicando misma lógica: gastos negativos)
      const totalMonto = filteredHistorial.reduce((sum, item) => {
        let monto = Number(item.monto) || 0;
        // Si es gasto o devolución y el monto es positivo, hacerlo negativo
        if (['gasto', 'devolucion'].includes(item.tipo) && monto > 0) {
          monto = -monto;
        }
        return sum + monto;
      }, 0);
      transSheet.getCell(`G${lastRow}`).value = totalMonto;
      transSheet.getCell(`G${lastRow}`).numFmt = '"+$" #,##0;"-$" #,##0';
      transSheet.getCell(`G${lastRow}`).font = { 
        name: 'Segoe UI', 
        size: 11, 
        bold: true, 
        color: { argb: totalMonto >= 0 ? COLOR_GREEN : COLOR_RED } 
      };
      transSheet.getCell(`G${lastRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_ROW_ALT },
      };
      transSheet.getCell(`G${lastRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
      
      // Aplicar borde superior a la fila de totales
      for (let col = 1; col <= 13; col++) {
        const cell = transSheet.getCell(lastRow, col);
        cell.border = {
          top: { style: 'double', color: { argb: COLOR_PRIMARY } },
          bottom: { style: 'medium', color: { argb: COLOR_PRIMARY } },
        };
      }
      transSheet.getRow(lastRow).height = 30;

      // Nombre de archivo
      const fileNameParts = ['historial-barberia'];
      if (dateFilter === 'custom' && startDate && endDate) {
        fileNameParts.push(`${startDate}_a_${endDate}`);
      } else if (dateFilter !== 'all') {
        fileNameParts.push(dateFilter);
      }
      const fileName = `${fileNameParts.join('-')}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando historial:', err);
      showInfoModal(
        'Error al exportar',
        'Ocurrió un error al generar el archivo de exportación.',
      );
    }
  };

  const handleOpenAddExpense = () => {
    setIsAddExpenseOpen(true);
  };

  const handleCloseAddExpense = () => {
    setIsAddExpenseOpen(false);
  };

  const handleChangeNewExpense = (
    field: 'concepto' | 'monto' | 'categoria' | 'fecha' | 'notas',
    value: string,
  ) => {
    setNewExpense((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitAddExpense = async (event: React.FormEvent) => {
    event.preventDefault();

    const concepto = newExpense.concepto.trim();
    const montoNumber = Number(newExpense.monto);

    if (!concepto) {
      setError('El concepto del gasto es obligatorio');
      return;
    }

    if (!Number.isFinite(montoNumber) || montoNumber <= 0) {
      setError('El monto del gasto debe ser mayor a 0');
      return;
    }

    try {
      setSavingExpense(true);
      setError(null);

      const response = await fetch('/api/admin/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepto,
          monto: montoNumber,
          categoria: newExpense.categoria || 'other',
          fecha_gasto: newExpense.fecha,
          notas: newExpense.notas?.trim() || null,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const message =
          result && typeof result.message === 'string'
            ? result.message
            : 'Error al crear el gasto desde historial';
        setError(message);
        return;
      }

      setIsAddExpenseOpen(false);
      setNewExpense({
        concepto: '',
        monto: '',
        categoria: newExpense.categoria,
        fecha: newExpense.fecha,
        notas: '',
      });

      await loadHistorial();
    } catch (err) {
      console.error('Error creando gasto desde historial:', err);
      setError('No se pudo crear el gasto');
    } finally {
      setSavingExpense(false);
    }
  };

  const openTransactionDetails = (transaction: HistorialItem) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const closeTransactionDetails = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  const getTypeColor = (type: string) => {
    const typeOption = transactionTypes.find(option => option.value === type);
    return typeOption ? typeOption.color : 'slate';
  };

  const getTypeLabel = (type: string) => {
    const typeOption = transactionTypes.find(option => option.value === type);
    return typeOption ? typeOption.label : type;
  };


  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistorial.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <span className="ml-3 text-gray-400">Cargando historial...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-400 font-medium">Error: {error}</span>
          </div>
          <button
            onClick={loadHistorial}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Historial de Transacciones</h1>
          <p className="text-gray-400 mt-1">Visualiza el historial completo de ventas, ingresos y gastos</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleOpenAddExpense}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-emerald-500/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Agregar Gasto</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-red-500/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Exportar</span>
          </button>
          <button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 border border-red-500/20 shadow-lg hover:shadow-red-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalIngresos)}</p>
            <p className="text-gray-400 text-sm">Total Ingresos</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4 4m4-4l-4-4" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalGastos)}</p>
            <p className="text-gray-400 text-sm">Total Gastos</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className={`text-2xl font-bold ${
              stats.gananciaTotal >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.gananciaTotal >= 0 ? '+' : ''}{formatCurrency(stats.gananciaTotal)}
            </p>
            <p className="text-gray-400 text-sm">Ganancia Total</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.totalTransacciones}</p>
            <p className="text-gray-400 text-sm">Transacciones</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar transacciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-red-500/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
          >
            {transactionTypes.map(type => (
              <option key={type.value} value={type.value} className="bg-gray-900">{type.label}</option>
            ))}
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
          >
            {dateFilters.map(filter => (
              <option key={filter.value} value={filter.value} className="bg-gray-900">{filter.label}</option>
            ))}
          </select>
          
          <div className="bg-black/20 border border-red-500/20 rounded-lg px-4 py-2 text-gray-300 text-sm flex items-center">
            {filteredHistorial.length} de {historial.length} registros
          </div>
        </div>
        
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all duration-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Lista de Transacciones */}
      <div className="bg-gradient-to-br from-black/60 to-gray-900/60 backdrop-blur-sm rounded-lg border border-red-500/20 shadow-lg overflow-hidden">
        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">No se encontraron transacciones</p>
            <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-black/80 to-gray-900/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cliente/Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-500/20">
                {currentItems.map((transaction, index) => {
                  const typeColor = getTypeColor(transaction.tipo);
                  return (
                    <tr
                      key={transaction.id || `historial-${index}`}
                      className="hover:bg-red-500/10 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDateTime(transaction.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          typeColor === 'green' ? 'bg-green-900/50 text-green-400 border border-green-500/30' :
                          typeColor === 'blue' ? 'bg-blue-900/50 text-blue-400 border border-blue-500/30' :
                          typeColor === 'red' ? 'bg-red-900/50 text-red-400 border border-red-500/30' :
                          typeColor === 'purple' ? 'bg-purple-900/50 text-purple-400 border border-purple-500/30' :
                          typeColor === 'orange' ? 'bg-orange-900/50 text-orange-400 border border-orange-500/30' :
                          'bg-gray-900/50 text-gray-400 border border-gray-500/30'
                        }`}>
                          {getTypeLabel(transaction.tipo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <div className="max-w-xs truncate">{transaction.descripcion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {transaction.cliente || transaction.proveedor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.monto >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {transaction.monto >= 0 ? '+' : ''}{formatCurrency(transaction.monto)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openTransactionDetails(transaction)}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/30"
                        >
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredHistorial.length)} de {filteredHistorial.length} registros
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-700 hover:to-gray-800 transition-all duration-200 border border-red-500/20 shadow-lg"
            >
              Anterior
            </button>
            
            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => paginate(pageNumber)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      currentPage === pageNumber
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-700 hover:to-gray-800 border border-red-500/20 shadow-lg'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (
                pageNumber === currentPage - 2 ||
                pageNumber === currentPage + 2
              ) {
                return <span key={pageNumber} className="px-2 text-gray-400">...</span>;
              }
              return null;
            })}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-700 hover:to-gray-800 transition-all duration-200 border border-red-500/20 shadow-lg"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal para agregar gasto */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-sm rounded-xl border border-red-500/30 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-500/20 flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Agregar Gasto</h2>
              <button
                onClick={handleCloseAddExpense}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitAddExpense} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">Concepto</label>
                <input
                  type="text"
                  value={newExpense.concepto}
                  onChange={(e) => handleChangeNewExpense('concepto', e.target.value)}
                  className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                  placeholder="Ej: Pago de servicios públicos"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-gray-300 text-sm font-medium">Monto</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newExpense.monto}
                    onChange={(e) => handleChangeNewExpense('monto', e.target.value)}
                    className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    placeholder="Ej: 50000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-300 text-sm font-medium">Fecha</label>
                  <input
                    type="date"
                    value={newExpense.fecha}
                    onChange={(e) => handleChangeNewExpense('fecha', e.target.value)}
                    className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">Categoría</label>
                <select
                  value={newExpense.categoria}
                  onChange={(e) => handleChangeNewExpense('categoria', e.target.value)}
                  className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                >
                  <option value="supplies" className="bg-gray-900">Insumos</option>
                  <option value="utilities" className="bg-gray-900">Servicios públicos</option>
                  <option value="salaries" className="bg-gray-900">Salarios</option>
                  <option value="rent" className="bg-gray-900">Arriendo</option>
                  <option value="barber_payment" className="bg-gray-900">Pago a barberos</option>
                  <option value="other" className="bg-gray-900">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">Notas</label>
                <textarea
                  value={newExpense.notas}
                  onChange={(e) => handleChangeNewExpense('notas', e.target.value)}
                  className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 min-h-[80px]"
                  placeholder="Detalles adicionales del gasto (opcional)"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAddExpense}
                  className="px-4 py-2 rounded-lg text-sm bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors duration-200"
                  disabled={savingExpense}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingExpense && (
                    <span className="inline-block h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  <span>Guardar Gasto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-sm rounded-xl border border-red-500/30 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-500/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Detalles de la Transacción</h2>
                <button
                  onClick={closeTransactionDetails}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Información General</h3>
                <div className="bg-black/40 border border-red-500/20 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID:</span>
                    <span className="text-white font-medium">#{selectedTransaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tipo:</span>
                    <span className={`font-medium ${
                      getTypeColor(selectedTransaction.tipo) === 'green' ? 'text-green-400' :
                      getTypeColor(selectedTransaction.tipo) === 'blue' ? 'text-blue-400' :
                      getTypeColor(selectedTransaction.tipo) === 'red' ? 'text-red-400' :
                      getTypeColor(selectedTransaction.tipo) === 'purple' ? 'text-purple-400' :
                      getTypeColor(selectedTransaction.tipo) === 'orange' ? 'text-orange-400' :
                      'text-gray-400'
                    }`}>
                      {getTypeLabel(selectedTransaction.tipo)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="text-white font-medium">{formatDateTime(selectedTransaction.fecha)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monto:</span>
                    <span className={`font-bold text-lg ${
                      selectedTransaction.monto >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedTransaction.monto >= 0 ? '+' : ''}{formatCurrency(selectedTransaction.monto)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Método de Pago:</span>
                    <span className="text-white font-medium">{selectedTransaction.metodoPago}</span>
                  </div>
                </div>
              </div>

              {/* Información de Cliente/Proveedor */}
              {(selectedTransaction.cliente || selectedTransaction.proveedor) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {selectedTransaction.cliente ? 'Información del Cliente' : 'Información del Proveedor'}
                  </h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nombre:</span>
                      <span className="text-white font-medium">
                        {selectedTransaction.cliente || selectedTransaction.proveedor}
                      </span>
                    </div>
                    {selectedTransaction.barbero && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Barbero:</span>
                        <span className="text-white font-medium">{selectedTransaction.barbero}</span>
                      </div>
                    )}
                    {selectedTransaction.categoria && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Categoría:</span>
                        <span className="text-white font-medium">{selectedTransaction.categoria}</span>
                      </div>
                    )}
                    {selectedTransaction.factura && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Factura:</span>
                        <span className="text-white font-medium">{selectedTransaction.factura}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Productos */}
              {selectedTransaction.productos && selectedTransaction.productos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Productos</h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                    {selectedTransaction.productos.map((producto, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-red-500/20 last:border-b-0">
                        <div>
                          <span className="text-white font-medium">{producto.nombre}</span>
                          <span className="text-gray-400 ml-2">x{producto.cantidad}</span>
                        </div>
                        <span className="text-green-400 font-medium">{formatCurrency(producto.precio * producto.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Servicios */}
              {selectedTransaction.servicios && selectedTransaction.servicios.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Servicios</h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                    {selectedTransaction.servicios.map((servicio, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-red-500/20 last:border-b-0">
                        <div>
                          <span className="text-white font-medium">{servicio.nombre}</span>
                          <span className="text-gray-400 ml-2">({servicio.duracion} min)</span>
                        </div>
                        <span className="text-blue-400 font-medium">{formatCurrency(servicio.precio)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {selectedTransaction.notas && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Notas</h3>
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                    <p className="text-white">{selectedTransaction.notas}</p>
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Descripción</h3>
                <div className="bg-black/40 border border-red-500/20 rounded-lg p-4">
                  <p className="text-white">{selectedTransaction.descripcion}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ModalComponent />
    </div>
  );
};

export default Historial;