import { CheckCircle2, Send } from 'lucide-react';
import { useState } from 'react';
import {
  createEmptyQuote,
  submitQuoteRequest,
  validateQuoteRequest,
} from '../adapters/quoteAdapter';

export default function QuoteForm({ submitAdapter = submitQuoteRequest }) {
  const [formData, setFormData] = useState(createEmptyQuote);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationErrors = validateQuoteRequest(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const submissionResult = await submitAdapter(formData);
      setResult(submissionResult);
      setFormData(createEmptyQuote());
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="tool-success" role="status" aria-live="polite">
        <CheckCircle2 aria-hidden="true" />
        <p className="eyebrow"><span>Received</span>Quote request</p>
        <h3>Your request is with the Flystar team.</h3>
        <p>Reference {result.reference}. A team member will contact you with rates and routing options.</p>
        <button type="button" className="button button-secondary" onClick={() => setResult(null)}>
          Request another quote
        </button>
      </div>
    );
  }

  return (
    <form className="tool-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field
          id="quote-full-name"
          label="Sender name"
          name="fullName"
          value={formData.fullName}
          onChange={updateField}
          error={errors.fullName}
          autoComplete="name"
        />
        <Field
          id="quote-mobile"
          label="Mobile number"
          name="mobileNumber"
          type="tel"
          value={formData.mobileNumber}
          onChange={updateField}
          error={errors.mobileNumber}
          autoComplete="tel"
          inputMode="numeric"
        />
        <Field
          id="quote-origin"
          label="Origin city"
          name="fromCity"
          value={formData.fromCity}
          onChange={updateField}
          error={errors.fromCity}
          autoComplete="address-level2"
        />
        <Field
          id="quote-destination"
          label="Destination country"
          name="destinationCountry"
          value={formData.destinationCountry}
          onChange={updateField}
          error={errors.destinationCountry}
          autoComplete="country-name"
          placeholder="e.g. United Kingdom"
        />

        <label className="field" htmlFor="quote-type">
          <span>Shipment type</span>
          <select
            id="quote-type"
            name="shipmentType"
            value={formData.shipmentType}
            onChange={updateField}
            aria-invalid={Boolean(errors.shipmentType)}
            aria-describedby={errors.shipmentType ? 'quote-type-error' : undefined}
          >
            <option value="">Select a type</option>
            <option value="Documents">Documents</option>
            <option value="Medicines">Medicines</option>
            <option value="Parcel">Parcel</option>
            <option value="Export / Import">Export / Import</option>
            <option value="Other">Other</option>
          </select>
          {errors.shipmentType && <small id="quote-type-error">{errors.shipmentType}</small>}
        </label>

        <Field
          id="quote-weight"
          label="Approximate weight"
          name="approxWeight"
          type="number"
          min="0.5"
          step="0.5"
          value={formData.approxWeight}
          onChange={updateField}
          suffix="kg"
        />
      </div>

      <label className="field" htmlFor="quote-message">
        <span>Shipment notes</span>
        <textarea
          id="quote-message"
          name="message"
          rows="4"
          value={formData.message}
          onChange={updateField}
          placeholder="Contents, timing, dimensions, or special handling details"
        />
      </label>

      <div className="form-footer">
        <p>Required fields help us prepare an accurate first response.</p>
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Sending request...' : 'Request rate quote'}
          <Send aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function Field({ id, label, error, suffix, ...inputProps }) {
  const errorId = `${id}-error`;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className={suffix ? 'field-with-suffix' : undefined}>
        <input
          id={id}
          aria-label={label}
          {...inputProps}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {suffix && <b aria-hidden="true">{suffix}</b>}
      </div>
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}
