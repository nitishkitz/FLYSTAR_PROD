import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TrackingPanel from './TrackingPanel';

describe('TrackingPanel', () => {
  it('requires a waybill number', async () => {
    const user = userEvent.setup();
    render(<TrackingPanel />);
    await user.click(screen.getByRole('button', { name: 'Track' }));
    expect(screen.getByText('Enter a waybill number')).toBeInTheDocument();
  });

  it('renders adapter results', async () => {
    const user = userEvent.setup();
    const adapter = vi.fn().mockResolvedValue({
      trackingId: 'FS-42',
      status: 'Delivered',
      events: [{
        title: 'Delivered',
        time: 'Today',
        location: 'Tirupati',
        description: 'Signed by recipient.',
      }],
    });
    render(<TrackingPanel lookupAdapter={adapter} />);

    await user.type(screen.getByLabelText('Waybill number'), 'fs-42');
    await user.click(screen.getByRole('button', { name: 'Track' }));

    expect(await screen.findByText('FS-42')).toBeInTheDocument();
    expect(screen.getByText('Signed by recipient.')).toBeInTheDocument();
  });
});
