import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface VirtualListProps<T> {
    items: readonly T[];
    /** Height one row takes before it is measured, in pixels. */
    estimate: number;
    keyOf: (item: T) => string;
    children: (item: T) => ReactNode;
}

/**
 * Renders only the rows the viewport can show, scrolling with the page itself.
 *
 * The unit roster is two hundred rows deep and every one of them carries an image; mounting all
 * of them costs a visible pause on a phone, and the reader only ever sees a handful. The list has
 * no scrollbar of its own: a second one inside the page is a worse read than a long page.
 */
export function VirtualList<T>({ items, estimate, keyOf, children }: VirtualListProps<T>) {
    const list = useRef<HTMLDivElement>(null);
    // Where the list starts on the page, so its rows are placed against the window's own scroll.
    const [top, setTop] = useState(0);

    // The start moves whenever what stands above the list changes height: the rows change with the
    // filters, and a narrower window wraps the filter chips onto more lines.
    useLayoutEffect(() => {
        const measure = () => {
            const element = list.current;
            if (element) setTop(element.getBoundingClientRect().top + window.scrollY);
        };

        measure();
        window.addEventListener('resize', measure);

        return () => { window.removeEventListener('resize', measure); };
    }, [items]);

    const virtual = useWindowVirtualizer({
        count: items.length,
        estimateSize: () => estimate,
        // React keeps a row's node when the list reorders, so nothing measures it again; keying the
        // size cache by position would hand that row the height of whatever stood there before.
        getItemKey: (index) => keyOf(items[index]),
        overscan: 6,
        gap: 8,
        scrollMargin: top,
    });

    // Without a window there is no viewport to measure, and a page written ahead of time is read by
    // search engines that follow every row's link; the browser replaces it with the windowed list.
    if (typeof window === 'undefined') {
        return (
            <div className="virtual virtual--static">
                {items.map((item) => (
                    <div className="virtual__row" key={keyOf(item)}>
                        {children(item)}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="virtual" ref={list}>
            <div className="virtual__runway" style={{ height: `${String(virtual.getTotalSize())}px` }}>
                {virtual.getVirtualItems().map((row) => (
                    <div
                        className="virtual__row"
                        key={keyOf(items[row.index])}
                        data-index={row.index}
                        ref={virtual.measureElement}
                        style={{ transform: `translateY(${String(row.start - top)}px)` }}
                    >
                        {children(items[row.index])}
                    </div>
                ))}
            </div>
        </div>
    );
}
