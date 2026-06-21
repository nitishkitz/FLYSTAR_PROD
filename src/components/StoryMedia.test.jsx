import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StoryMedia from './StoryMedia';

const chapter = {
  id: 'chapter-test',
  poster: '/poster.jpg',
  desktopSource: '/desktop.mp4',
  mobileSource: '/mobile.mp4',
  focalPoint: '50% 50%',
};

describe('StoryMedia', () => {
  it('keeps the poster when video loading fails', () => {
    const { container } = render(
      <StoryMedia
        chapter={chapter}
        index={0}
        prepared
        mobile={false}
        setMediaRef={vi.fn()}
      />,
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    fireEvent.error(video);
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/poster.jpg');
  });
});
