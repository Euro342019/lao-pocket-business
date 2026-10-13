import { useId, useRef, useState, type FormEvent } from 'react';
import type { Transaction, TransactionInput, TransactionType } from '../../types/transaction';
import { usePreferences } from '../../app/preferences';
import { Modal } from '../../components/Modal';
import { categoriesFor, defaultCategoryFor, isValidCategory } from '../categories/categories';
import { formatMoney, formatNumber, parseAmount } from '../../utils/money';
import { isValidISODate, todayISO } from '../../utils/date';
import { MAX_DESCRIPTION_LENGTH } from './validation';
import type { TranslationKey } from '../../i18n/translations';

interface TransactionFormProps {
  /** When given, the form edits this transaction; otherwise it creates a new one. */
  existing?: Transaction;
  /**
   * Save the input. Return null when it was saved (the parent closes the
   * form), or an error message to show; the form then stays open with the
   * user's input so nothing typed is lost.
   */
  onSubmit: (input: TransactionInput) => string | null;
  onClose: () => void;
}

type Errors = Partial<Record<'amount' | 'category' | 'date' | 'description', TranslationKey>>;

export function TransactionForm({ existing, onSubmit, onClose }: TransactionFormProps) {
  const { t } = usePreferences();
  const formId = useId();
  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amountText, setAmountText] = useState(existing ? formatNumber(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? defaultCategoryFor('expense'));
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [description, setDescription] = useState(existing?.description ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  // Guards against double submission (double tap, Enter pressed twice).
  const submittedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const parsed = parseAmount(amountText);

  const changeType = (next: TransactionType) => {
    setType(next);
    if (!isValidCategory(categoryId, next)) setCategoryId(defaultCategoryFor(next));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submittedRef.current) return;

    const nextErrors: Errors = {};
    if (!parsed.ok) nextErrors.amount = `error.amount.${parsed.error}`;
    if (!isValidCategory(categoryId, type)) nextErrors.category = 'error.category';
    if (!isValidISODate(date)) nextErrors.date = 'error.date';
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) nextErrors.description = 'error.description';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !parsed.ok) {
      const firstInvalid = document.querySelector<HTMLElement>(`[data-form="${formId}"] [aria-invalid="true"]`);
      firstInvalid?.focus();
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);
    setSaveError(null);
    const failure = onSubmit({ type, amount: parsed.value, categoryId, date, description: description.trim() });
    if (failure) {
      // Not saved: keep the form open and allow another try.
      submittedRef.current = false;
      setSubmitting(false);
      setSaveError(failure);
    }
  };

  const errorId = (field: keyof Errors) => `${formId}-${field}-error`;
  const fieldError = (field: keyof Errors) =>
    errors[field] ? (
      <p id={errorId(field)} className="field__error" role="alert">
        {t(errors[field]!, { max: MAX_DESCRIPTION_LENGTH })}
      </p>
    ) : null;

  return (
    <Modal
      title={existing ? t('form.editTitle') : t('form.addTitle')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button--secondary" onClick={onClose}>
            {t('action.cancel')}
          </button>
          <button type="submit" form={formId} className="button button--primary" disabled={submitting}>
            {t('action.save')}
          </button>
        </>
      }
    >
      <form id={formId} data-form={formId} className="form" onSubmit={handleSubmit} noValidate>
        {saveError && (
          <p className="notice notice--error" role="alert" data-testid="form-save-error">
            {saveError}
          </p>
        )}
        <fieldset className="segmented">
          <legend className="visually-hidden">{t('type.label')}</legend>
          {(['expense', 'income'] as const).map((option) => (
            <label key={option} className={`segmented__option segmented__option--${option}`}>
              <input
                type="radio"
                name={`${formId}-type`}
                value={option}
                checked={type === option}
                onChange={() => changeType(option)}
              />
              <span>{t(option === 'income' ? 'type.income' : 'type.expense')}</span>
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor={`${formId}-amount`}>{t('form.amount')}</label>
          <input
            id={`${formId}-amount`}
            className="input input--amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="next"
            placeholder={t('form.amountPlaceholder')}
            value={amountText}
            onChange={(e) => {
              setAmountText(e.target.value);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? errorId('amount') : `${formId}-amount-preview`}
            data-autofocus
          />
          <p id={`${formId}-amount-preview`} className="field__hint" aria-live="polite">
            {parsed.ok ? formatMoney(parsed.value) : ' '}
          </p>
          {fieldError('amount')}
        </div>

        <div className="field">
          <label htmlFor={`${formId}-category`}>{t('form.category')}</label>
          <select
            id={`${formId}-category`}
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? errorId('category') : undefined}
          >
            {categoriesFor(type).map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.labelKey)}
              </option>
            ))}
          </select>
          {fieldError('category')}
        </div>

        <div className="field">
          <label htmlFor={`${formId}-date`}>{t('form.date')}</label>
          <input
            id={`${formId}-date`}
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? errorId('date') : undefined}
          />
          {fieldError('date')}
        </div>

        <div className="field">
          <label htmlFor={`${formId}-description`}>{t('form.description')}</label>
          <input
            id={`${formId}-description`}
            className="input"
            type="text"
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder={t('form.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? errorId('description') : undefined}
          />
          {fieldError('description')}
        </div>
      </form>
    </Modal>
  );
}
