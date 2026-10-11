import { optionElementId, SelectBoxKeyDispatcher } from '@select-box/core';
import { useSelectBox } from '@select-box/react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { PickerOption } from '../components/picker.tsx';
import { pickerFilter } from '../picker-search.ts';

export interface PickerBoxOptions {
    /** The element holding the control and its list, so a press outside can close it. */
    container: RefObject<HTMLElement | null>;
    options: readonly PickerOption[];
    /** The choice the owner holds, or null for a field that hands each pick on without keeping it. */
    value: string | null;
    onPick: (option: PickerOption) => void;
}

export interface PickerBox {
    isOpen: boolean;
    /** What has been typed into the filter. */
    query: string;
    /** The entries the filter leaves, best match first. */
    visible: readonly PickerOption[];
    /** The entry the keys have reached, or null while the list is closed or empty. */
    active: PickerOption | null;
    /** Ties the control to its list. */
    listId: string;
    /** The id an entry's element carries, so the control can point at the active one. */
    optionId: (value: string) => string;
    open: () => void;
    toggle: () => void;
    setQuery: (query: string) => void;
    pick: (option: PickerOption) => void;
    onKeyDown: (event: KeyboardEvent) => void;
}

/** What rides on each entry besides its value and label. */
interface PickerExtra {
    visual?: ReactNode;
}

/**
 * The state and keyboard behaviour of one choice list, driven by the select-box core.
 *
 * @param options - The entries, the choice the owner holds, and what to do with a new one.
 * @returns What the markup needs and the handlers to spread on it.
 */
export function usePickerBox({ container, options, value, onPick }: PickerBoxOptions): PickerBox {
    const [filter] = useState(() => pickerFilter<PickerExtra>());
    const { state, controller } = useSelectBox<PickerExtra>({ options, initialValue: value, filter });
    const dispatcher = useMemo(() => new SelectBoxKeyDispatcher(controller), [controller]);
    const instanceId = useId();

    // The core keeps copies of the entries, so each one is read back through the owner's own
    // object and the picture drawn beside it is the one from the latest render.
    const byValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);

    // Owners rebuild the list on every render, so only a list that reads differently is handed over.
    const synced = useRef(options);
    useEffect(() => {
        if (sameEntries(synced.current, options)) return;
        synced.current = options;
        controller.setOptions(options);
    }, [controller, options]);

    useEffect(() => {
        if (state.value !== value) controller.commitValue(value);
    }, [controller, state.value, value]);

    useEffect(() => {
        if (!state.open) return;

        const onPointerDown = (event: PointerEvent) => {
            if (!container.current?.contains(event.target as Node)) controller.close();
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [state.open, controller, container]);

    const visible = useMemo(
        () =>
            state.filteredGroups
                .flatMap((group) => group.options)
                .map((option) => byValue.get(option.value) ?? option),
        [state.filteredGroups, byValue],
    );

    const active = state.activeOption === null ? null : (byValue.get(state.activeOption.value) ?? state.activeOption);

    const pick = (option: PickerOption) => {
        controller.commitOption(option);
        onPick(option);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const live = controller.getState();
        // Inside the filter these keys belong to the text: a space is part of a name like
        // "Arqueiro Tupi", and Home and End move the caret.
        const typing = event.target instanceof HTMLInputElement;

        if (live.open && (event.key === 'Enter' || (event.key === ' ' && !typing))) {
            event.preventDefault();
            if (live.activeOption) pick(byValue.get(live.activeOption.value) ?? live.activeOption);

            return;
        }

        if (live.open && !typing && (event.key === 'Home' || event.key === 'End')) {
            event.preventDefault();
            const count = live.filteredGroups.reduce((total, group) => total + group.options.length, 0);
            controller.moveActive(event.key === 'Home' ? -live.activeIndex : count - 1 - live.activeIndex);

            return;
        }

        if (dispatcher.dispatch(event.key) === 'handled') event.preventDefault();
    };

    return {
        isOpen: state.open,
        query: state.query,
        visible,
        active,
        listId: `${instanceId}-list`,
        optionId: (optionValue) => optionElementId(instanceId, optionValue),
        open: () => {
            controller.open();
        },
        toggle: () => {
            controller.toggle();
        },
        setQuery: (query) => {
            controller.setQuery(query);
        },
        pick,
        onKeyDown,
    };
}

function sameEntries(left: readonly PickerOption[], right: readonly PickerOption[]): boolean {
    return (
        left.length === right.length &&
        left.every((option, index) => option.value === right[index].value && option.label === right[index].label)
    );
}
