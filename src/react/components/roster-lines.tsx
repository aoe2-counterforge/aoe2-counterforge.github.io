import { useTranslation } from 'react-i18next';
import type { CategoryLines } from '../category-lines.ts';
import { LineChain } from './line-chain.tsx';

export interface RosterLinesProps {
    groups: readonly CategoryLines[];
    /** What to say of a faded step: why the line never reaches it where it is being read. */
    missing: string;
}

/** The upgrade lines of a roster one category at a time, the chains first and the lone units last. */
export function RosterLines({ groups, missing }: RosterLinesProps) {
    const { t } = useTranslation();

    return groups.map((group) => (
        <div className="roster__group" key={group.category}>
            <div className="section-label roster__label">{t(`categories.${group.category}`)}</div>
            <div className="list">
                {group.chains.map((line) => (
                    <LineChain key={line.line} steps={line.steps} missing={missing} />
                ))}
                {group.standalone.map((step) => (
                    <LineChain key={step[0].unit.key} steps={[step]} missing={missing} />
                ))}
            </div>
        </div>
    ));
}
