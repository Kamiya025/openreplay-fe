import React from 'react';
import { VList, VListHandle } from 'virtua';
import cn from 'classnames';
import { Duration } from 'luxon';
import { NoContent, Icon } from 'UI';
import { Button } from 'antd';
import { percentOf } from 'App/utils';

import { observer } from 'mobx-react-lite';
import BarRow from './BarRow';
import stl from './timeTable.module.css';

import autoscrollStl from '../autoscroll.module.css';
import JumpButton from '../JumpButton';
import { useTranslation } from 'react-i18next';

type Timed = {
  time: number;
};

type Durationed = {
  duration: number;
};

type CanBeRed = {
  // +isRed: boolean,
  isRed: boolean;
};

interface Row extends Timed, Durationed, CanBeRed {
  [key: string]: any;
  key: string;
}

type Line = {
  color: string; // Maybe use typescript?
  hint?: string;
  onClick?: any;
} & Timed;

type Column = {
  label: string;
  width: number;
  dataKey?: string;
  render?: (row: any) => void;
  referenceLines?: Array<Line>;
  style?: React.CSSProperties;
  onClick?: void;
} & RenderOrKey;

type RenderOrKey =
  | {
      render?: (row: Row) => React.ReactNode;
      key?: string;
    }
  | {
      dataKey: string;
    };

type Props = {
  className?: string;
  rows: Array<Row>;
  children: Array<Column>;
  tableHeight?: number;
  activeIndex?: number;
  renderPopup?: boolean;
  navigation?: boolean;
  referenceLines?: any[];
  additionalHeight?: number;
  hoverable?: boolean;
  onRowClick?: (row: any, index: number) => void;
  onJump?: (obj: { time: number }) => void;
  extra?: (row: Record<string, any>) => React.ReactNode;
};

type TimeLineInfo = {
  timestart: number;
  timewidth: number;
};

let _additionalHeight = 0;
const ROW_HEIGHT = 24;

const TIME_SECTIONS_COUNT = 8;
const ZERO_TIMEWIDTH = 1000;
function formatTime(ms: number) {
  if (ms < 0) return '';
  if (ms < 1000) return Duration.fromMillis(ms).toFormat('0.SSS');
  return Duration.fromMillis(ms).toFormat('mm:ss');
}

function computeTimeLine(
  rows: Array<Row>,
  firstVisibleRowIndex: number,
  visibleCount: number,
): TimeLineInfo {
  const visibleRows = rows.slice(
    firstVisibleRowIndex,
    firstVisibleRowIndex + visibleCount + _additionalHeight,
  );
  let timestart =
    visibleRows.length > 0 ? Math.min(...visibleRows.map((r) => r.time)) : 0;
  // TODO: GraphQL requests do not have a duration, so their timeline is borked. Assume a duration of 0.2s for every GraphQL request
  const timeend =
    visibleRows.length > 0
      ? Math.max(...visibleRows.map((r) => r.time + (r.duration ?? 200)))
      : 0;
  let timewidth = timeend - timestart;
  const offset = timewidth / 70;
  if (timestart >= offset) {
    timestart -= offset;
  }
  timewidth *= 1.5; // += offset;
  if (timewidth === 0) {
    timewidth = ZERO_TIMEWIDTH;
  }
  return {
    timestart,
    timewidth,
  };
}

function TimeTable(props: Props) {
  const tableHeight = props.tableHeight || 195;
  const visibleCount = Math.ceil(tableHeight / ROW_HEIGHT);
  const [timerange, setTimerange] = React.useState({
    timestart: 0,
    timewidth: 0,
  });
  const [firstVisibleRowIndex, setFirstVisibleRowIndex] = React.useState(0);
  const scroller = React.createRef<VListHandle>();
  const { timestart, timewidth } = timerange;

  React.useEffect(() => {
    const { timestart, timewidth } = computeTimeLine(
      props.rows,
      firstVisibleRowIndex,
      visibleCount,
    );
    setTimerange({ timestart, timewidth });
  }, [
    props.rows.length,
    visibleCount,
    _additionalHeight,
    firstVisibleRowIndex,
  ]);
  React.useEffect(() => {
    if (props.activeIndex && props.activeIndex >= 0 && scroller.current) {
      scroller.current.scrollToIndex(props.activeIndex, {
        align: 'center',
        smooth: false,
      });
      setFirstVisibleRowIndex(props.activeIndex ?? 0);
    }
  }, [props.activeIndex]);

  const onJump = (index: any) => {
    if (props.onJump) {
      props.onJump(props.rows[index]);
    }
  };

  const onPrevClick = () => {
    let prevRedIndex = -1;
    for (let i = firstVisibleRowIndex - 1; i >= 0; i--) {
      if (props.rows[i].isRed) {
        prevRedIndex = i;
        break;
      }
    }
    if (scroller.current != null) {
      scroller.current.scrollToIndex(prevRedIndex);
    }
  };

  const onNextClick = () => {
    let prevRedIndex = -1;
    for (let i = firstVisibleRowIndex + 1; i < props.rows.length; i++) {
      if (props.rows[i].isRed) {
        prevRedIndex = i;
        break;
      }
    }
    if (scroller.current != null) {
      scroller.current.scrollToIndex(prevRedIndex);
    }
  };

  const {
    className,
    rows,
    navigation = false,
    referenceLines = [],
    additionalHeight = 0,
    renderPopup,
    hoverable,
    onRowClick,
    activeIndex,
  } = props;
  const columns = props.children.filter((i: any) => !i.hidden);

  _additionalHeight = additionalHeight;

  const sectionDuration = Math.round(timewidth / TIME_SECTIONS_COUNT);
  const timeColumns: number[] = [];
  if (timewidth > 0) {
    for (let i = 0; i < TIME_SECTIONS_COUNT; i++) {
      timeColumns.push(timestart + i * sectionDuration);
    }
  }

  const visibleRefLines = referenceLines.filter(
    ({ time }) => time > timestart && time < timestart + timewidth,
  );

  const columnsSumWidth = columns.reduce((sum, { width }) => sum + width, 0);

  return (
    <div className={cn(className, 'relative')}>
      {navigation && (
        <div className={cn(autoscrollStl.navButtons, 'flex items-center')}>
          <Button
            type="text"
            icon={<Icon name="chevron-up" />}
            onClick={onPrevClick}
          />
          <Button
            type="text"
            icon={<Icon name="chevron-down" />}
            onClick={onNextClick}
          />
        </div>
      )}
      <div className={stl.headers}>
        <div className={stl.infoHeaders}>
          {columns.map(({ label, width, dataKey, onClick = null }) => (
            <div
              key={parseInt(label.replace(' ', ''), 36)}
              className={cn(stl.headerCell, 'flex items-center select-none', {
                'cursor-pointer': typeof onClick === 'function',
              })}
              style={{ width: `${width}px` }}
            >
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className={stl.waterfallHeaders}>
          {timeColumns.map((time, i) => (
            <div className={stl.timeCell} key={`tc-${i}`}>
              {formatTime(time)}
            </div>
          ))}
        </div>
      </div>

      <NoContent size="small" show={rows.length === 0}>
        <div className="relative" style={{ height: tableHeight }}>
          <div
            className={stl.timePart}
            style={{ left: `${columnsSumWidth}px` }}
          >
            {timeColumns.map((_, index) => (
              <div key={`tc-${index}`} className={stl.timeCell} />
            ))}
            {visibleRefLines.map(({ time, color, onClick }) => (
              <div
                key={time}
                className={cn(stl.refLine, `bg-${color}`)}
                style={{
                  left: `${percentOf(time - timestart, timewidth)}%`,
                  cursor: typeof onClick === 'function' ? 'click' : 'auto',
                }}
                onClick={onClick}
              />
            ))}
          </div>
          <VList
            className={stl.list}
            ref={scroller}
            itemSize={ROW_HEIGHT}
            count={rows.length}
            overscan={10}
            onScroll={(offset) => {
              const firstVisibleRowIndex = Math.floor(
                offset / ROW_HEIGHT + 0.33,
              );
              setFirstVisibleRowIndex(firstVisibleRowIndex);
            }}
          >
            {(index) => (
              <RowRenderer
                row={rows[index]}
                index={index}
                columns={columns}
                timestart={timestart}
                timewidth={timewidth}
                renderPopup={renderPopup}
                hoverable={hoverable}
                onRowClick={onRowClick}
                activeIndex={activeIndex}
                onJump={onJump}
                extra={props.extra}
              />
            )}
          </VList>
        </div>
      </NoContent>
    </div>
  );
}

function RowRenderer({
  index,
  row,
  columns,
  timestart,
  timewidth,
  renderPopup,
  hoverable,
  onRowClick,
  activeIndex,
  onJump,
  extra,
}: any) {
  if (!row) return;
  return (
    <div
      className={cn(
        'dev-row border-b border-neutral-950/5 group items-center text-sm',
        stl.row,
        {
          [stl.hoverable]: hoverable,
          'error color-red': row.isRed,
          'cursor-pointer': typeof onRowClick === 'function',
          [stl.activeRow]: activeIndex === index,
          [stl.inactiveRow]: !activeIndex || index > activeIndex,
        },
      )}
      onClick={
        typeof onRowClick === 'function'
          ? () => onRowClick(row, index)
          : undefined
      }
      id="table-row"
    >
      <RowColumns columns={columns} row={row} />
      <div
        className={cn('relative flex-1 flex', stl.timeBarWrapper)}
        style={{ height: 15 }}
      >
        <BarRow
          resource={row}
          timestart={timestart}
          timewidth={timewidth}
          popup={renderPopup}
        />
      </div>
      <JumpButton
        extra={extra ? extra(row) : null}
        onClick={() => onJump(index)}
      />
    </div>
  );
}

const RowColumns = ({ columns, row }: any) => {
  const { t } = useTranslation();

  return columns.map(({ dataKey, render, width, label }: any) => (
    <div
      key={label.replace(' ', '') + dataKey}
      className={cn(stl.cell, 'overflow-ellipsis overflow-hidden !py-0.5')}
      style={{ width: `${width}px` }}
    >
      {render
        ? render(row)
        : row[dataKey || ''] || (
            <i className="color-gray-light">{t('empty')}</i>
          )}
    </div>
  ));
};

export default observer(TimeTable);
