import { CheckCircle2, Send } from 'lucide-react';
import { useState } from 'react';
import {
  createEmptyQuote,
  submitQuoteRequest,
  validateQuoteRequest,
} from '../adapters/quoteAdapter';
import { formatApiError } from '../lib/api';

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
    } catch (error) {
      setErrors({ form: formatApiError(error?.response?.data?.detail) || 'Could not raise pickup. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="tool-success" role="status" aria-live="polite">
        <CheckCircle2 aria-hidden="true" />
        <p className="eyebrow"><span>Created</span>Pickup request</p>
        <h3>Your pickup request is now in the Flystar queue.</h3>
        <p>AWB {result.reference}. A field representative can now accept it from the employee pickup queue.</p>
        <button type="button" className="button button-secondary" onClick={() => setResult(null)}>
          Raise another pickup
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
          id="quote-email"
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={updateField}
          error={errors.email}
          autoComplete="email"
        />
        <Field
          id="quote-mobile"
          label="Phone number"
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
          id="quote-pickup-address"
          label="Pickup address"
          name="pickupAddress"
          value={formData.pickupAddress}
          onChange={updateField}
          error={errors.pickupAddress}
          autoComplete="street-address"
        />
        <Field
          id="quote-pickup-state"
          label="Pickup state"
          name="pickupState"
          value={formData.pickupState}
          onChange={updateField}
          error={errors.pickupState}
          autoComplete="address-level1"
        />
        <Field
          id="quote-pickup-country"
          label="Pickup country"
          name="pickupCountry"
          value={formData.pickupCountry}
          onChange={updateField}
          error={errors.pickupCountry}
          autoComplete="country-name"
        />
        <Field
          id="quote-receiver-name"
          label="Receiver name"
          name="receiverName"
          value={formData.receiverName}
          onChange={updateField}
          error={errors.receiverName}
          autoComplete="name"
        />
        <Field
          id="quote-receiver-phone"
          label="Receiver phone"
          name="receiverPhone"
          type="tel"
          value={formData.receiverPhone}
          onChange={updateField}
          error={errors.receiverPhone}
          autoComplete="tel"
        />
        <Field
          id="quote-receiver-address"
          label="Receiver address"
          name="receiverAddress"
          value={formData.receiverAddress}
          onChange={updateField}
          error={errors.receiverAddress}
          autoComplete="street-address"
        />
        <Field
          id="quote-destination-city"
          label="Destination city"
          name="destinationCity"
          value={formData.destinationCity}
          onChange={updateField}
          error={errors.destinationCity}
          autoComplete="address-level2"
        />
        <Field
          id="quote-destination-state"
          label="Destination state"
          name="destinationState"
          value={formData.destinationState}
          onChange={updateField}
          autoComplete="address-level1"
        />
        <Field
          id="quote-destination-postal"
          label="Destination postal / zip"
          name="destinationPostal"
          value={formData.destinationPostal}
          onChange={updateField}
          autoComplete="postal-code"
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

        <label className="field" htmlFor="quote-service">
          <span>Service</span>
          <select
            id="quote-service"
            name="service"
            value={formData.service}
            onChange={updateField}
          >
            <option value="economy">Economy</option>
            <option value="priority">Priority</option>
            <option value="express">Express</option>
          </select>
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
        <Field
          id="quote-length"
          label="Length"
          name="lengthCm"
          type="number"
          min="0"
          value={formData.lengthCm}
          onChange={updateField}
          suffix="cm"
        />
        <Field
          id="quote-width"
          label="Width"
          name="widthCm"
          type="number"
          min="0"
          value={formData.widthCm}
          onChange={updateField}
          suffix="cm"
        />
        <Field
          id="quote-height"
          label="Height"
          name="heightCm"
          type="number"
          min="0"
          value={formData.heightCm}
          onChange={updateField}
          suffix="cm"
        />
      </div>

      <label className="field" htmlFor="quote-message">
        <span>Contents description</span>
        <textarea
          id="quote-message"
          name="message"
          rows="4"
          value={formData.message}
          onChange={updateField}
          placeholder="Contents, timing, or special handling details"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'quote-message-error' : undefined}
        />
        {errors.message && <small id="quote-message-error">{errors.message}</small>}
      </label>

      <div className="form-footer">
        <p>Email and phone are mandatory so the pickup can be assigned and coordinated.</p>
        {errors.form && <small className="field-error">{errors.form}</small>}
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Raising pickup...' : 'Raise pickup request'}
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
