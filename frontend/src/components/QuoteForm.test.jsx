import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuoteForm from './QuoteForm';

describe('QuoteForm', () => {
  it('shows accessible validation errors', async () => {
    render(<QuoteForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Request rate quote' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Sender name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits through the injected adapter', async () => {
    const user = userEvent.setup();
    const adapter = vi.fn().mockResolvedValue({ ok: true, reference: 'FSQ-3210' });
    render(<QuoteForm submitAdapter={adapter} />);

    await user.type(screen.getByLabelText('Sender name'), 'Naina Reddy');
    await user.type(screen.getByLabelText('Mobile number'), '9876543210');
    await user.clear(screen.getByLabelText('Destination country'));
    await user.type(screen.getByLabelText('Destination country'), 'UK');
    await user.selectOptions(screen.getByLabelText('Shipment type'), 'Parcel');
    await user.click(screen.getByRole('button', { name: 'Request rate quote' }));

    expect(await screen.findByText(/Reference FSQ-3210/)).toBeInTheDocument();
    expect(adapter).toHaveBeenCalledOnce();
  });
});
