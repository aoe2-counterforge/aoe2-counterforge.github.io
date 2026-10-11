export interface TabOption<T extends string> {
    value: T;
    label: string;
    /** How many rows the tab holds, shown as a small pill beside the label. */
    count?: number;
}

export interface TabsProps<T extends string> {
    value: T;
    options: readonly TabOption<T>[];
    onChange: (value: T) => void;
}

/** A row of tabs, one of them selected, switching the section shown under it. */
export function Tabs<T extends string>({ value, options, onChange }: TabsProps<T>) {
    return (
        <div className="tabs" role="tablist">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="tab"
                    className="tabs__item"
                    aria-selected={option.value === value}
                    onClick={() => { onChange(option.value); }}
                >
                    {option.label}
                    {option.count === undefined ? null : <span className="tabs__count">{option.count}</span>}
                </button>
            ))}
        </div>
    );
}
