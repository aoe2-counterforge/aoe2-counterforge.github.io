import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { RosterStep } from '../../services/game-catalog/game-catalog-service.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';

export interface LineChainProps {
    /** One entry per upgrade step, each holding the alternatives at that point. */
    steps: readonly (readonly RosterStep[])[];
    /** What to say of a faded step: why the line never reaches it where it is being read. */
    missing: string;
    /** True for units that merely share a box: none upgrades into another, so nothing joins them. */
    standalone?: boolean;
}

/**
 * An upgrade line as a row of pills, one per unit, the arrows between them reading as the upgrades.
 *
 * A step the line never reaches here stays in the row, faded: the gap is what a civilization page
 * has to say about a line every civilization starts the same way, and what a technology page has
 * to say about a line it only touches part of.
 */
export function LineChain({ steps, missing, standalone = false }: LineChainProps) {
    const { t } = useTranslation();
    const text = useGameText();

    return (
        <div className="chain">
            {steps.map((step, index) => (
                <Fragment key={step[0].unit.key}>
                    {step.map((entry, choice) => {
                        const unavailable = entry.available ? null : missing;

                        // The arrow travels with the pill it points at, so a wrapped row opens with it.
                        return (
                            <span className="chain__hop" key={entry.unit.key}>
                                {choice > 0 ? (
                                    <span className="chain__or">{t('unit.lineOr')}</span>
                                ) : index > 0 && !standalone ? (
                                    <Icon name="next" className="chain__arrow" />
                                ) : null}
                                <Link
                                    className="chain__step"
                                    to={`/unit/${entry.unit.key}`}
                                    data-missing={unavailable === null ? undefined : true}
                                    data-unique={entry.unit.uniqueTo === null ? undefined : true}
                                    title={unavailable ?? undefined}
                                >
                                    <GameIcon
                                        path={entry.unit.icon === null ? null : `Unit/${String(entry.unit.icon)}.png`}
                                        alt=""
                                        size="sm"
                                    />
                                    <span className="chain__name">{text.unit(entry.unit.key).name}</span>
                                    {unavailable === null ? null : (
                                        <span className="visually-hidden">{unavailable}</span>
                                    )}
                                </Link>
                                {entry.unit.inTechTree ? null : <span className="badge">{t('units.offTreeBadge')}</span>}
                            </span>
                        );
                    })}
                </Fragment>
            ))}
        </div>
    );
}
