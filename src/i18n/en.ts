export const en = {
  appTitle: 'Cashflow Timeline',
  privacyNote: 'Everything stays in this browser. Nothing is sent anywhere.',

  // Toolbar
  horizon: 'Duration',
  horizonHint: 'How many months the plan covers, counting from the start month.',
  horizonMonths: '{n} months',
  horizonCustom: 'Custom',
  currency: 'Currency',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  openSetup: 'Setup',
  clearAll: 'Clear all data',
  clearConfirm: 'Delete the plan stored in this browser? This cannot be undone.',
  importError_invalidJson: 'That file is not valid JSON.',
  importError_unsupportedVersion: 'That file was made by an unsupported version of this app.',
  importError_invalidPlan: 'That file does not contain a valid plan.',
  storageError: 'Could not save on this device. Changes will be lost when you close the tab — export your plan to keep it.',

  // Summary
  summaryAllPositive: 'All {n} months positive ✓',
  summaryFirstNegative: 'First negative: {month}',
  summaryLowest: 'Lowest: {amount} in {month}',
  summaryRecovers: 'Recovers: {month}',
  summaryNeverRecovers: 'Does not recover within the plan duration',

  // Chart + grid
  chartTitle: 'Closing balance by month',
  opening: 'Opening',
  totalIn: 'Total in',
  totalOut: 'Total out',
  net: 'Net',
  closing: 'Closing balance',
  item: 'Item',
  income: 'Income',
  expenses: 'Expenses',
  noItems: 'No items yet. Open Setup to add your income and expenses.',
  addOneOff: 'Add a one-off in {month}',
  moveTo: 'Move to',

  // Setup dialog
  setupTitle: 'Plan setup',
  basics: 'Basics',
  startingBalance: 'Starting balance',
  startMonth: 'Start month',
  language: 'Language',
  addIncome: 'Add income',
  addExpense: 'Add expense',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  savePlan: 'Save plan',
  cancel: 'Cancel',
  add: 'Add',

  // Item form
  label: 'Label',
  amount: 'Amount',
  note: 'Note (optional)',
  direction: 'Type',
  directionIn: 'Income',
  directionOut: 'Expense',
  recurrence: 'Repeats',
  recurrenceMonthly: 'Every month',
  recurrenceOnce: 'Once',
  recurrenceEveryN: 'Every N months',
  recurrenceSpecificMonths: 'Specific months of the year',
  month: 'Month',
  everyN: 'Every how many months',
  monthsOfYear: 'Months',
  from: 'From',
  to: 'Until (optional)',
  errLabel: 'Enter a label.',
  errAmount: 'Enter an amount greater than zero.',
  errN: 'Enter a number of months of 2 or more.',
  errMonths: 'Pick at least one month.',
  errWindow: '"Until" must not be before "From".',

  // Error boundary
  errorTitle: 'Something went wrong',
  errorBody: 'The stored plan could not be displayed. You can clear it and start again — nothing is lost outside this browser.',

  // Theme
  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
} as const;

export type MessageKey = keyof typeof en;
