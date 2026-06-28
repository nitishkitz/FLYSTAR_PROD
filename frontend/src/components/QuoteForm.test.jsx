import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuoteForm from './QuoteForm';

describe('QuoteForm', () => {
  it('shows accessible validation errors', async () => {
    render(<QuoteForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Raise pickup request' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Sender name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits through the injected adapter', async () => {
    const user = userEvent.setup();
    const adapter = vi.fn().mockResolvedValue({ ok: true, reference: 'FLY123456' });
    render(<QuoteForm submitAdapter={adapter} />);

    await user.type(screen.getByLabelText('Sender name'), 'Naina Reddy');
    await user.type(screen.getByLabelText('Email'), 'naina@example.com');
    await user.type(screen.getByLabelText('Phone number'), '9876543210');
    await user.type(screen.getByLabelText('Pickup address'), '18 Temple Road');
    await user.type(screen.getByLabelText('Receiver name'), 'Aisha Khan');
    await user.type(screen.getByLabelText('Receiver phone'), '+97455123456');
    await user.type(screen.getByLabelText('Receiver address'), 'Al Sadd Street');
    await user.type(screen.getByLabelText('Destination city'), 'Doha');
    await user.clear(screen.getByLabelText('Destination country'));
    await user.type(screen.getByLabelText('Destination country'), 'Qatar');
    await user.selectOptions(screen.getByLabelText('Shipment type'), 'Parcel');
    await user.type(screen.getByLabelText('Contents description'), 'Documents');
    await user.click(screen.getByRole('button', { name: 'Raise pickup request' }));

    expect(await screen.findByText(/AWB FLY123456/)).toBeInTheDocument();
    expect(adapter).toHaveBeenCalledOnce();
  });
});
