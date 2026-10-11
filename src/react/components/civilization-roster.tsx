import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Civilization } from '../../domain/entities/civilization.ts';
import { LAND_CATEGORIES } from '../../domain/enums/unit-category.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useServices } from '../hooks/use-services.ts';
import type { RosterView } from '../roster-view.ts';
import { LineChain } from './line-chain.tsx';
import { SegmentedControl } from './segmented-control.tsx';
import { UnitListItem } from './unit-list-item.tsx';

export interface CivilizationRosterProps {
    civilization: Civilization;
    view: RosterView;
    onViewChange: (view: RosterView) => void;
}

/**
 * The units a civilization can train, by category, as a plain list or as the upgrade lines they form.
 *
 * The list is the roster as the game names it, one unit a row. The lines are the roster as a player
 * thinks of it, one line a row, with the steps the civilization never reaches faded out.
 */
export function CivilizationRoster({ civilization, view, onViewChange }: CivilizationRosterProps) {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();
    const civName = text.civilization(civilization.key).name;
    const missing = t('unit.notAvailable', { civ: civName });

    const list = useMemo(
        () =>
            LAND_CATEGORIES.map((category) => ({
                category,
                units: catalog.units({ civ: civilization.key, categories: [category] }),
            })).filter((group) => group.units.length > 0),
        [catalog, civilization],
    );

    // Units that upgrade into nothing share one box per category, so a lone Trebuchet is not a line.
    const lines = useMemo(
        () =>
            LAND_CATEGORIES.map((category) => {
                const all = catalog.rosterLines({ civ: civilization.key, category });

                return {
                    category,
                    chains: all.filter((line) => line.steps.length > 1),
                    standalone: all.filter((line) => line.steps.length === 1).flatMap((line) => line.steps),
                };
            }).filter((group) => group.chains.length > 0 || group.standalone.length > 0),
        [catalog, civilization],
    );

    const hasGaps = lines.some((group) =>
        group.chains.some((line) => line.steps.some((step) => step.some((entry) => !entry.available))),
    );

    return (
        <section className="card">
            <div className="card__title">
                <h2>{t('civ.roster')}</h2>
                <SegmentedControl
                    label={t('civ.view')}
                    value={view}
                    options={[
                        { value: 'list', label: t('civ.viewList') },
                        { value: 'lines', label: t('civ.viewLines') },
                    ]}
                    onChange={onViewChange}
                />
            </div>

            {view === 'list'
                ? list.map((group) => (
                      <div className="roster__group" key={group.category}>
                          <div className="section-label roster__label">{t(`categories.${group.category}`)}</div>
                          <ul className="list list--columns">
                              {group.units.map((unit) => (
                                  <li key={unit.key}>
                                      <UnitListItem unit={unit} subtitle={t(`ages.${unit.age}`)} />
                                  </li>
                              ))}
                          </ul>
                      </div>
                  ))
                : lines.map((group) => (
                      <div className="roster__group" key={group.category}>
                          <div className="section-label roster__label">{t(`categories.${group.category}`)}</div>
                          <div className="list">
                              {group.chains.map((line) => (
                                  <LineChain key={line.line} steps={line.steps} missing={missing} />
                              ))}
                              {group.standalone.length > 0 ? (
                                  <LineChain steps={group.standalone} missing={missing} standalone />
                              ) : null}
                          </div>
                      </div>
                  ))}

            {view === 'lines' && hasGaps ? (
                <p className="card__hint roster__hint">{t('civ.linesHint', { civ: civName })}</p>
            ) : null}
        </section>
    );
}
