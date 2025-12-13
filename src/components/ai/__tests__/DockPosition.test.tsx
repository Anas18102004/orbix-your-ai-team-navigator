// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import { AIDockSidebar } from '../AIDockSidebar';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock utils
vi.mock('@/lib/socket', () => ({
    socketClient: { on: vi.fn(), off: vi.fn() }
}));

vi.mock('@/contexts/AppContext', () => ({
    useApp: () => ({ currentWorkspace: { name: 'Test WS' } })
}));

describe('AIDockSidebar Positioning', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 256,
            height: 1000,
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            x: 0,
            y: 0,
            toJSON: () => { }
        }));

        // Mock querySelector to return a fake sidebar
        document.querySelector = vi.fn().mockReturnValue(document.createElement('aside'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('calculates left offset based on sidebar width', () => {
        render(
            <BrowserRouter>
                <AIDockSidebar />
            </BrowserRouter>
        );

        // Sidebar width is mocked as 256. +16 offset = 272.
        const dock = screen.getByText('Ask Orbix').closest('.fixed');
        expect(dock).toHaveStyle({ left: '272px' });
    });

    it('updates position on resize', () => {
        render(
            <BrowserRouter>
                <AIDockSidebar />
            </BrowserRouter>
        );

        // Change mock width
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 300,
            height: 1000,
            top: 0, bottom: 0, left: 0, right: 0, x: 0, y: 0, toJSON: () => { }
        }));

        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        const dock = screen.getByText('Ask Orbix').closest('.fixed');
        expect(dock).toHaveStyle({ left: '316px' }); // 300 + 16
    });
});
