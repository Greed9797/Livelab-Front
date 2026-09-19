# react-app/src/components/conteudo/LivesTab.tsx

- DateRange · type · L38-L38 — type DateRange = 'todos' | 'hoje' | '7d' | '30d' | 'mes' | 'custom'
- localIsoDate · function · L51-L53 — function localIsoDate(date: Date): string
- isIsoCalendarDate · function · L55-L59 — function isIsoCalendarDate(value: string): boolean
- isValidCustomDateRange · function · L61-L63 — function isValidCustomDateRange(from: string, to: string, today = localIsoDate(new Date())): boolean
- dateRangeToWindow · function · L66-L80 — function dateRangeToWindow(range: DateRange, customFrom = '', customTo = ''): { data_inicio?: string; data_fim?: string }
- groupByDay · function · L84-L104 — function groupByDay(lives: JsonRecord[])
- doExportCSV · function · L106-L158 — function doExportCSV(lives: JsonRecord[])
- StatusBadge · function · L162-L199 — function StatusBadge({ status }: { status: unknown })
- TipoBadge · function · L201-L225 — function TipoBadge({ tipo }: { tipo: unknown })
- MenuBtn · function · L227-L276 — function MenuBtn({ icon, label, hint, danger, onClick, }: { icon: React.ReactNode label: string hint?: string danger?: boolean onClick: () => void })
- LivesTabProps · interface · L280-L322 — interface LivesTabProps
- LivesTab · function · L335-L1511 — function LivesTab({ canWrite = true, livesData, liveModalMode, selectedLiveRecord, reportCopied, deleteLiveMutation, onOpenCreateLiveModal, onOpenLiveDetail, onOpenEditLive, onSplitApresentadoras, onDeleteLive, onCloseLiveModal, onCopyLiveReport, onInlineSaveLive, duplicateLiveIds, duplicateClusterCount = 0, dateRange, onDateRangeChange, customDateFrom, customDateTo, customDateError, onCustomDateFromChange, onCustomDateToChange, marcaFilterId, apresentadoraFilterId, onMarcaFilterChange, onApresentadoraFilterChange, marcaFilterOptions, apresentadoraFilterOptions, onClearFilters, searchQuery, onSearchChange, statusFilter, onStatusFilterChange, page, pageSize, total, onPageChange, onPageSizeChange, }: LivesTabProps)
- close · function · L398-L402 — close = ()
- handle · function · L415-L421 — handle = (e: KeyboardEvent)
- toggleDay · function · L489-L496 — function toggleDay(key: string)
- toggleKebabMenu · function · L498-L514 — function toggleKebabMenu(event: React.MouseEvent<HTMLButtonElement>, liveId: string, live: JsonRecord)
