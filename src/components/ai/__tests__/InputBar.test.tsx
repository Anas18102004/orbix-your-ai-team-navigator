// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { AiInputBar } from '../AiInputBar';
import { describe, it, expect, vi } from 'vitest';

describe('AiInputBar', () => {
    it('renders in the DOM with correct positioning classes', () => {
        render(<AiInputBar onSend={vi.fn()} />);

        const container = screen.getByPlaceholderText(/Ask Orbix anything/i).closest('.absolute');
        expect(container).toBeInTheDocument();
        // Updated to expect absolute as per implementation which mimics fixed within valid container
        expect(container).toHaveClass('absolute');
        expect(container).toHaveClass('bottom-6');
    });

    it('focuses textarea on mount', () => {
        render(<AiInputBar onSend={vi.fn()} />);
        const textarea = screen.getByPlaceholderText(/Ask Orbix anything/i);
        expect(textarea).toHaveFocus();
    });
});
