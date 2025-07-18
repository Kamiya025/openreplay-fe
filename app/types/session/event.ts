const CONSOLE = 'CONSOLE';
const CLICK = 'CLICK';
const INPUT = 'INPUT';
const LOCATION = 'LOCATION';
const CUSTOM = 'CUSTOM';
const CLICKRAGE = 'CLICKRAGE';
const DEAD_LICK = 'dead_click';
const TAPRAGE = 'tap_rage';
const IOS_VIEW = 'VIEW';
const UXT_EVENT = 'UXT_EVENT';
const TOUCH = 'TAP';
const SWIPE = 'SWIPE';
const INCIDENT = 'INCIDENT';

export const TYPES = {
  CONSOLE,
  CLICK,
  INPUT,
  LOCATION,
  CUSTOM,
  CLICKRAGE,
  DEAD_LICK,
  IOS_VIEW,
  TOUCH,
  SWIPE,
  TAPRAGE,
  UXT_EVENT,
  INCIDENT,
};

export type EventType =
  | typeof CONSOLE
  | typeof CLICK
  | typeof INPUT
  | typeof LOCATION
  | typeof CUSTOM
  | typeof CLICKRAGE
  | typeof IOS_VIEW
  | typeof TOUCH
  | typeof SWIPE
  | typeof INCIDENT

interface IEvent {
  time: number;
  timestamp: number;
  type: EventType;
  name: string;
  key: number;
  label: string;
  targetPath: string;
  tabId?: string;
  messageId?: number;
  target: {
    path: string;
    label: string;
  };
  isHighlighted?: boolean;
}

interface ConsoleEvent extends IEvent {
  subtype: string;
  value: string;
}

interface ClickEvent extends IEvent {
  targetContent: string;
  count: number;
  hesitation: number;
  selector: string;
}

interface TouchEvent extends IEvent {
  targetContent: string;
  count: number;
}

interface SwipeEvent extends IEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  label: string;
}

interface InputEvent extends IEvent {
  value: string;
  hesitation: number;
  duration: number;
}

export interface LocationEvent extends IEvent {
  url: string;
  host: string;
  pageLoad: boolean;
  fcpTime: number;
  loadTime: number;
  domContentLoadedTime: number;
  domBuildingTime: number;
  speedIndex: number;
  visuallyComplete: number;
  timeToInteractive: number;
  referrer: string;
  firstContentfulPaintTime: number;
  firstPaintTime: number;
  webVitals: string | null;
}

export interface IncidentEvent extends IEvent {
  label: string;
  startTime: number;
  endTime: number;
}

export type EventData =
  | ConsoleEvent
  | ClickEvent
  | InputEvent
  | LocationEvent
  | IEvent;

class Event {
  key: IEvent['key'];

  time: IEvent['time'];

  label: IEvent['label'];

  target: IEvent['target'];

  tabId: IEvent['tabId'];

  messageId: IEvent['messageId'];

  isHighlighted: IEvent['isHighlighted'];

  constructor(event: IEvent) {
    Object.assign(this, {
      time: event.time,
      label: event.label,
      key: event.key,
      tabId: event.tabId,
      messageId: event.messageId,
      isHighlighted: event.isHighlighted,
      target: {
        path: event.target?.path || event.targetPath,
        label: event.target?.label,
      },
    });
  }
}

class Swipe extends Event {
  readonly type = SWIPE;

  readonly name = 'Swipe';

  readonly label: string;

  readonly direction: string;

  constructor(evt: SwipeEvent) {
    super(evt);
    this.label = evt.label;
    this.direction = evt.direction;
  }
}

class Console extends Event {
  readonly type = CONSOLE;

  readonly name = 'Console';

  subtype: string;

  value: string;

  constructor(evt: ConsoleEvent) {
    super(evt);
    this.subtype = evt.subtype;
    this.value = evt.value;
  }
}

export class Click extends Event {
  readonly type: typeof CLICKRAGE | typeof CLICK = CLICK;

  readonly name = 'Click';

  targetContent = '';

  count: number;

  hesitation: number = 0;

  selector: string;

  isHighlighted: boolean | undefined = false;

  constructor(evt: ClickEvent, isClickRage?: boolean) {
    super(evt);
    this.targetContent = evt.targetContent;
    this.count = evt.count;
    this.hesitation = evt.hesitation;
    this.selector = evt.selector;
    this.isHighlighted = evt.isHighlighted;
    if (isClickRage) {
      this.type = CLICKRAGE;
    }
  }
}

export class Touch extends Event {
  readonly type: typeof TOUCH = TOUCH;

  readonly name = 'Tap';

  targetContent = '';

  count: number;

  hesitation: number = 0;

  constructor(evt: TouchEvent) {
    super(evt);
    this.targetContent = evt.targetContent;
    this.count = evt.count;
  }
}

export class Input extends Event {
  readonly type = INPUT;

  readonly name = 'Input';

  readonly hesitation: number = 0;

  readonly duration: number = 0;

  value = '';

  constructor(evt: InputEvent) {
    super(evt);
    this.value = evt.value;
    this.hesitation = evt.hesitation;
    this.duration = evt.duration;
  }
}

export class Location extends Event {
  readonly name = 'Location';

  readonly type = LOCATION;

  url: LocationEvent['url'];

  host: LocationEvent['host'];

  fcpTime: LocationEvent['fcpTime'];

  loadTime: LocationEvent['loadTime'];

  domContentLoadedTime: LocationEvent['domContentLoadedTime'];

  domBuildingTime: LocationEvent['domBuildingTime'];

  speedIndex: LocationEvent['speedIndex'];

  visuallyComplete: LocationEvent['visuallyComplete'];

  timeToInteractive: LocationEvent['timeToInteractive'];

  referrer: LocationEvent['referrer'];

  webvitals: {
    cls?: number;
    lcp?: number;
    inp?: number;
    ttfb?: number;
  } | null;

  constructor(evt: LocationEvent) {
    super(evt);
    Object.assign(this, {
      ...evt,
      fcpTime: evt.firstContentfulPaintTime || evt.firstPaintTime,
      webvitals: evt.webVitals ? JSON.parse(evt.webVitals) : null,
    });
  }
}

export class Incident extends Event {
  readonly name = 'Incident';

  readonly type = CUSTOM;

  constructor(evt: IncidentEvent) {
    super(evt);
    Object.assign(this, {
      ...evt,
      label: evt.label || 'User signaled an incident',
      type: 'INCIDENT',
    });
  }
}

export type InjectedEvent =
  | Console
  | Click
  | Input
  | Location
  | Touch
  | Swipe
  | UxtEvent
  | Incident;

export default function (event: EventData) {
  if ('allow_typing' in event) {
    return new UxtEvent(event);
  }
  if (!event.type) {
    return console.error('Unknown event type: ', event);
  }
  switch (event.type) {
    case CONSOLE:
      return new Console(event as ConsoleEvent);
    case TOUCH:
      return new Touch(event as TouchEvent);
    case CLICK:
      return new Click(event as ClickEvent);
    case INPUT:
      return new Input(event as InputEvent);
    case LOCATION:
      return new Location(event as LocationEvent);
    case CLICKRAGE:
      return new Click(event as ClickEvent, true);
    case SWIPE:
      return new Swipe(event as SwipeEvent);
    case INCIDENT:
      return new Incident(event as IncidentEvent);
    default:
      return console.error(`Unknown event type: ${event.type}`);
  }
}

export class UxtEvent {
  readonly name = 'UxtEvent';

  readonly type = UXT_EVENT;

  allowTyping: boolean;

  comment: string;

  description: string;

  duration: number;

  status: string;

  taskId: number;

  timestamp: number;

  title: string;

  indexNum: number;

  time: number;

  constructor(event: Record<string, any>) {
    Object.assign(this, {
      type: UXT_EVENT,
      name: 'UxtEvent',
      allowTyping: event.allow_typing,
      comment: event.comment,
      description: event.description,
      duration: event.duration,
      status: event.status,
      taskId: event.taskId,
      timestamp: event.timestamp,
      time: event.time,
      title: event.title,
      indexNum: event.indexNum,
    });
  }
}
