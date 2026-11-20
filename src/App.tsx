import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

type MovementType = 'income' | 'expense';
type HistoryFilter = 'all' | MovementType;

interface Movement {
  id: string;
  type: MovementType;
  concept: string;
  amount: number;
  date: string;
  createdAt: number;
}

function getLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeISODate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return getLocalISODate(date);
}

const INITIAL_MOVEMENTS: Movement[] = [
  {
    id: 'm-1',
    type: 'income',
    concept: 'Sueldo mensual',
    amount: 3200,
    date: getLocalISODate(),
    createdAt: 3,
  },
  {
    id: 'm-2',
    type: 'expense',
    concept: 'Supermercado',
    amount: 420,
    date: getLocalISODate(),
    createdAt: 2,
  },
  {
    id: 'm-3',
    type: 'expense',
    concept: 'Servicios del hogar',
    amount: 330,
    date: getRelativeISODate(-1),
    createdAt: 1,
  },
];

function formatDateLabel(isoDate: string): string {
  if (!isoDate) return 'Hoy';
  const todayStr = getLocalISODate();
  if (isoDate === todayStr) return 'Hoy';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === getLocalISODate(yesterday)) return 'Ayer';

  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return isoDate;
  }

  const [year, month, day] = parts;
  const localDate = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(localDate);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface FeedbackMessage {
  type: MovementType | 'neutral';
  title: string;
  detail: string;
}

export default function App() {
  const [movements, setMovements] = useState<Movement[]>(INITIAL_MOVEMENTS);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [hideBalance, setHideBalance] = useState(false);
  const [activeSheet, setActiveSheet] = useState<MovementType | null>(null);
  const [conceptInput, setConceptInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dateInput, setDateInput] = useState(() => getLocalISODate());
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const { totalIncome, totalExpense, balance, incomeCount, expenseCount } =
    useMemo(() => {
      let incomeCents = 0;
      let expenseCents = 0;
      let inCount = 0;
      let exCount = 0;

      for (const movement of movements) {
        const cents = Math.round(movement.amount * 100);
        if (movement.type === 'income') {
          incomeCents += cents;
          inCount += 1;
        } else {
          expenseCents += cents;
          exCount += 1;
        }
      }

      const balanceCents = incomeCents - expenseCents;
      return {
        totalIncome: incomeCents / 100,
        totalExpense: expenseCents / 100,
        balance: balanceCents / 100,
        incomeCount: inCount,
        expenseCount: exCount,
      };
    }, [movements]);

  const sortedMovements = useMemo(() => {
    const filtered =
      historyFilter === 'all'
        ? movements
        : movements.filter((m) => m.type === historyFilter);

    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt - a.createdAt;
    });
  }, [movements, historyFilter]);

  const openSheet = (type: MovementType) => {
    setActiveSheet(type);
    setConceptInput('');
    setAmountInput('');
    setDateInput(getLocalISODate());
    setFormError('');
  };

  const closeSheet = () => {
    setActiveSheet(null);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number.parseFloat(amountInput.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('El monto debe ser mayor que cero.');
      return;
    }

    if (!activeSheet) return;

    const cleanAmount = Math.round(parsedAmount * 100) / 100;
    const defaultConcept =
      activeSheet === 'income' ? 'Ingreso registrado' : 'Gasto registrado';
    const finalConcept = conceptInput.trim() || defaultConcept;
    const movementDate = dateInput || getLocalISODate();

    const newMovement: Movement = {
      id: `m-${Date.now()}`,
      type: activeSheet,
      concept: finalConcept,
      amount: cleanAmount,
      date: movementDate,
      createdAt: Date.now(),
    };

    setMovements((prev) => [newMovement, ...prev]);
    setFeedback({
      type: activeSheet,
      title:
        activeSheet === 'income'
          ? 'Ingreso registrado correctamente'
          : 'Gasto registrado correctamente',
      detail: `${activeSheet === 'income' ? '+' : '-'}${formatCurrency(cleanAmount)} · ${finalConcept}`,
    });
    closeSheet();
  };

  const handleDeleteMovement = (movement: Movement) => {
    setMovements((prev) => prev.filter((m) => m.id !== movement.id));
    setFeedback({
      type: 'neutral',
      title: 'Movimiento eliminado',
      detail: `${movement.concept} · ${formatCurrency(movement.amount)}`,
    });
  };

  const handleResetDemo = () => {
    setMovements(INITIAL_MOVEMENTS);
    setHistoryFilter('all');
  };

  const maskValue = (formatted: string) =>
    hideBalance ? 'S/ ••••••' : formatted;

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#111815] flex flex-col">
      {/* Encabezado compacto móvil */}
      <header className="sticky top-0 z-30 h-14 bg-[#F6F8F7]/90 backdrop-blur-md border-b border-[#E3E9E6]">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-xl bg-[#0F3D2E] text-white flex items-center justify-center shrink-0"
            >
              <Wallet className="w-4 h-4" strokeWidth={2.2} />
            </span>
            <h1 className="font-display text-lg font-bold tracking-tight text-[#111815] whitespace-nowrap truncate">
              Mi Dinero
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setHideBalance((prev) => !prev)}
            className="min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-medium text-[#4A5A53] hover:text-[#111815] hover:bg-[#EAEFED] active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F3D2E]"
            aria-label={hideBalance ? 'Mostrar montos' : 'Ocultar montos'}
          >
            {hideBalance ? (
              <>
                <Eye className="w-4 h-4" />
                <span>Mostrar</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Ocultar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Contenido principal adaptable */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-5 rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${
              feedback.type === 'income'
                ? 'bg-[#ECFDF5] border-[#B7E4D0] text-[#065F46]'
                : 'bg-[#F0F4F2] border-[#C9D6D0] text-[#0F3D2E]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">
                  {feedback.title}
                </p>
                <p className="text-xs opacity-90 truncate">
                  {hideBalance ? 'Monto registrado' : feedback.detail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Cerrar aviso"
              className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-black/5 inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Columna principal: Tarjeta de saldo + Botones de acción */}
          <section
            aria-label="Saldo disponible y acciones rápidas"
            className="lg:col-span-5 flex flex-col gap-4"
          >
            {/* Tarjeta de saldo disponible */}
            <div
              className={`rounded-3xl text-white p-6 sm:p-7 transition-colors duration-200 ${
                balance < 0 ? 'bg-[#4B1818]' : 'bg-[#0F3D2E]'
              }`}
            >
              <div
                className={`flex items-center justify-between gap-2 text-xs sm:text-sm ${
                  balance < 0 ? 'text-[#FECACA]' : 'text-[#B7D7CA]'
                }`}
              >
                <span className="font-medium">Saldo disponible</span>
                <span aria-hidden="true">·</span>
                <span>Ingresos − Gastos</span>
              </div>

              <p
                className={`mt-3 font-display text-4xl sm:text-[2.65rem] font-bold tracking-tight tabular-nums leading-none ${
                  balance < 0 ? 'text-[#FEE2E2]' : 'text-white'
                }`}
              >
                {maskValue(formatCurrency(balance))}
              </p>

              <div
                className={`mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs ${
                  balance < 0 ? 'text-[#FECACA]' : 'text-[#CBE3D9]'
                }`}
              >
                <span>Estado del balance</span>
                <span className="tabular-nums font-semibold text-white">
                  {balance < 0
                    ? 'Saldo negativo'
                    : balance === 0
                      ? 'Equilibrado'
                      : 'Positivo'}
                </span>
              </div>
            </div>

            {/* Dos botones principales: Registrar ingreso y Registrar gasto */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openSheet('income')}
                className="min-h-[52px] px-3 sm:px-4 py-3 rounded-2xl bg-[#0D7A52] hover:bg-[#0A6443] text-white font-semibold text-[13px] sm:text-sm inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7A52]"
              >
                <ArrowDownLeft className="w-4 h-4 shrink-0" strokeWidth={2.4} />
                <span>Registrar ingreso</span>
              </button>

              <button
                type="button"
                onClick={() => openSheet('expense')}
                className="min-h-[52px] px-3 sm:px-4 py-3 rounded-2xl bg-[#FEF2F2] hover:bg-[#FDE4E4] text-[#991B1B] border border-[#F5C6C6] font-semibold text-[13px] sm:text-sm inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C23B3B]"
              >
                <ArrowUpRight
                  className="w-4 h-4 shrink-0 text-[#C23B3B]"
                  strokeWidth={2.4}
                />
                <span>Registrar gasto</span>
              </button>
            </div>
          </section>

          {/* Columna secundaria: Tres indicadores + Lista básica */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Tres indicadores: Ingresos, Gastos y Saldo */}
            <section aria-labelledby="indicadores-titulo">
              <div className="flex items-baseline justify-between mb-3">
                <h2
                  id="indicadores-titulo"
                  className="font-display text-base sm:text-lg font-semibold text-[#111815]"
                >
                  Indicadores
                </h2>
                <span className="text-xs text-[#5B6B63]">
                  {movements.length}{' '}
                  {movements.length === 1 ? 'movimiento' : 'movimientos'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Indicador: Ingresos */}
                <div className="rounded-2xl bg-white border border-[#D1E8DC] p-4 sm:p-5 flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-[#37453F]">
                      Ingresos
                    </span>
                    <span
                      aria-hidden="true"
                      className="w-7 h-7 rounded-lg bg-[#ECFDF5] text-[#0D7A52] flex items-center justify-center shrink-0"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="font-display text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-[#0D7A52] truncate">
                    {maskValue(formatCurrency(totalIncome))}
                  </p>
                  <span className="text-xs text-[#5B6B63]">
                    {incomeCount} {incomeCount === 1 ? 'ingreso' : 'ingresos'}
                  </span>
                </div>

                {/* Indicador: Gastos */}
                <div className="rounded-2xl bg-white border border-[#F3D4D4] p-4 sm:p-5 flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-[#37453F]">
                      Gastos
                    </span>
                    <span
                      aria-hidden="true"
                      className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#C23B3B] flex items-center justify-center shrink-0"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="font-display text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-[#C23B3B] truncate">
                    {maskValue(formatCurrency(totalExpense))}
                  </p>
                  <span className="text-xs text-[#5B6B63]">
                    {expenseCount} {expenseCount === 1 ? 'gasto' : 'gastos'}
                  </span>
                </div>

                {/* Indicador: Saldo */}
                <div
                  className={`col-span-2 sm:col-span-1 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2.5 border ${
                    balance < 0
                      ? 'bg-[#FEF2F2] border-[#F5C6C6]'
                      : 'bg-white border-[#E3E9E6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-[#37453F]">
                      Saldo
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        balance < 0
                          ? 'bg-[#FDE4E4] text-[#C23B3B]'
                          : 'bg-[#EEF3F1] text-[#0F3D2E]'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                    </span>
                  </div>
                  <p
                    className={`font-display text-xl sm:text-2xl font-bold tracking-tight tabular-nums truncate ${
                      balance < 0 ? 'text-[#C23B3B]' : 'text-[#111815]'
                    }`}
                  >
                    {maskValue(formatCurrency(balance))}
                  </p>
                  <span
                    className={`text-xs ${
                      balance < 0 ? 'font-medium text-[#991B1B]' : 'text-[#5B6B63]'
                    }`}
                  >
                    {balance < 0 ? 'Gastos superan ingresos' : 'Ingresos − Gastos'}
                  </span>
                </div>
              </div>
            </section>

            {/* Módulo de historial de movimientos */}
            <section
              aria-labelledby="movimientos-titulo"
              className="rounded-2xl bg-white border border-[#E3E9E6]"
            >
              <div className="px-4 sm:px-5 py-4 border-b border-[#EDF1EF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2
                      id="movimientos-titulo"
                      className="font-display text-base font-semibold text-[#111815]"
                    >
                      Historial de movimientos
                    </h2>
                    <p className="text-xs text-[#6B7B73]">
                      Ordenados del más reciente al más antiguo
                    </p>
                  </div>

                  {movements !== INITIAL_MOVEMENTS && (
                    <button
                      type="button"
                      onClick={handleResetDemo}
                      className="sm:hidden min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-[#4A5A53] hover:text-[#111815] hover:bg-[#F2F5F3] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restablecer</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div
                    role="group"
                    aria-label="Filtrar historial"
                    className="inline-flex items-center gap-1 p-1 bg-[#F2F5F3] rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        historyFilter === 'all'
                          ? 'bg-white text-[#111815] shadow-xs'
                          : 'text-[#5B6B63] hover:text-[#111815]'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('income')}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        historyFilter === 'income'
                          ? 'bg-white text-[#0D7A52] shadow-xs'
                          : 'text-[#5B6B63] hover:text-[#111815]'
                      }`}
                    >
                      Ingresos
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('expense')}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        historyFilter === 'expense'
                          ? 'bg-white text-[#C23B3B] shadow-xs'
                          : 'text-[#5B6B63] hover:text-[#111815]'
                      }`}
                    >
                      Gastos
                    </button>
                  </div>

                  {movements !== INITIAL_MOVEMENTS && (
                    <button
                      type="button"
                      onClick={handleResetDemo}
                      className="hidden sm:inline-flex min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-[#4A5A53] hover:text-[#111815] hover:bg-[#F2F5F3] items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restablecer</span>
                    </button>
                  )}
                </div>
              </div>

              {sortedMovements.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[#4A5A53]">
                    {movements.length === 0
                      ? 'Aún no hay movimientos registrados.'
                      : historyFilter === 'income'
                        ? 'No hay ingresos registrados.'
                        : 'No hay gastos registrados.'}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7B73]">
                    {movements.length === 0
                      ? 'Usa los botones superiores para registrar tu primer ingreso o gasto.'
                      : 'Cambia el filtro o registra un nuevo movimiento.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#EDF1EF]">
                  {sortedMovements.map((item) => {
                    const isIncome = item.type === 'income';
                    return (
                      <li
                        key={item.id}
                        className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            aria-hidden="true"
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isIncome
                                ? 'bg-[#ECFDF5] text-[#0D7A52]'
                                : 'bg-[#FEF2F2] text-[#C23B3B]'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#111815] truncate">
                              {item.concept}
                            </p>
                            <p className="text-xs text-[#5B6B63] flex items-center gap-1.5">
                              <span
                                className={`font-medium ${
                                  isIncome ? 'text-[#0D7A52]' : 'text-[#C23B3B]'
                                }`}
                              >
                                {isIncome ? 'Ingreso' : 'Gasto'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{formatDateLabel(item.date)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isIncome ? 'text-[#0D7A52]' : 'text-[#C23B3B]'
                            }`}
                          >
                            {hideBalance
                              ? '••••'
                              : `${isIncome ? '+' : '-'}${formatCurrency(item.amount)}`}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDeleteMovement(item)}
                            aria-label={`Eliminar ${item.concept}`}
                            title="Eliminar movimiento"
                            className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl text-[#7A8A82] hover:text-[#C23B3B] hover:bg-[#FEF2F2] inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C23B3B]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Panel inferior (Bottom Sheet en móvil / Modal en escritorio) */}
      {activeSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onClick={closeSheet}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border-t sm:border border-[#E3E9E6] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Indicador táctil de arrastre para móvil */}
            <div
              aria-hidden="true"
              className="w-10 h-1.5 bg-[#D5DFDA] rounded-full mx-auto mb-4 sm:hidden"
            />

            <div className="flex items-center justify-between gap-4 mb-5">
              <h2
                id="sheet-title"
                className="font-display text-lg font-bold text-[#111815]"
              >
                {activeSheet === 'income'
                  ? 'Registrar ingreso'
                  : 'Registrar gasto'}
              </h2>

              <button
                type="button"
                onClick={closeSheet}
                aria-label="Cerrar ventana"
                className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl text-[#5B6B63] hover:text-[#111815] hover:bg-[#F2F5F3] inline-flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-4"
            >
              <div>
                <label
                  htmlFor="concept-input"
                  className="block text-sm font-medium text-[#37453F] mb-1.5"
                >
                  {activeSheet === 'income'
                    ? 'Concepto del ingreso'
                    : 'Concepto del gasto'}
                </label>
                <input
                  id="concept-input"
                  type="text"
                  maxLength={60}
                  autoFocus
                  placeholder={
                    activeSheet === 'income'
                      ? 'Ej. Nómina, Pago de proyecto, Venta'
                      : 'Ej. Café, Transporte, Compras'
                  }
                  value={conceptInput}
                  onChange={(e) => setConceptInput(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#F6F8F7] border border-[#D5DFDA] text-sm text-[#111815] placeholder:text-[#8E9C95] focus:outline-none focus:border-[#0F3D2E] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="amount-input"
                  className="block text-sm font-medium text-[#37453F] mb-1.5"
                >
                  {activeSheet === 'income' ? 'Monto recibido' : 'Monto'}
                </label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-semibold text-[#5B6B63]"
                  >
                    S/
                  </span>
                  <input
                    id="amount-input"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    aria-invalid={Boolean(formError)}
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className={`w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-[#F6F8F7] border text-base font-semibold tabular-nums text-[#111815] placeholder:text-[#8E9C95] focus:outline-none focus:bg-white transition-colors ${
                      formError
                        ? 'border-[#C23B3B] focus:border-[#C23B3B]'
                        : 'border-[#D5DFDA] focus:border-[#0F3D2E]'
                    }`}
                  />
                </div>
                {formError && (
                  <p
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-[#C23B3B]"
                  >
                    {formError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="date-input"
                  className="block text-sm font-medium text-[#37453F] mb-1.5"
                >
                  Fecha
                </label>
                <input
                  id="date-input"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#F6F8F7] border border-[#D5DFDA] text-sm text-[#111815] focus:outline-none focus:border-[#0F3D2E] focus:bg-white transition-colors"
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeSheet}
                  className="min-h-[48px] px-4 rounded-xl bg-[#F2F5F3] hover:bg-[#E5ECE8] text-[#37453F] text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={`min-h-[48px] px-4 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer ${
                    activeSheet === 'income'
                      ? 'bg-[#0D7A52] hover:bg-[#0A6443]'
                      : 'bg-[#C23B3B] hover:bg-[#A62E2E]'
                  }`}
                >
                  {activeSheet === 'income'
                    ? 'Guardar ingreso'
                    : 'Guardar gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
