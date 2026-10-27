/**
 * Event History Service (DSA Requirement C & D: Linked List & Recursion Integration)
 * 
 * Owns a bounded SinglyLinkedList to store controller events in memory,
 * and executes recursive pattern analysis on demand for diagnostics and UI auditing.
 */

import { ControllerEvent } from '../types/telemetry';
import { SinglyLinkedList } from '../data-structures/LinkedList';
import { analyzeEventsRecursively, RecursiveDiagnosticMetrics } from '../algorithms/analyzeSensorEvents';

export class EventHistoryService {
  private eventList: SinglyLinkedList<ControllerEvent>;

  constructor(capacity: number = 50) {
    this.eventList = new SinglyLinkedList<ControllerEvent>(capacity);
  }

  /**
   * Appends an event to the linked list with O(1) time complexity.
   * If capacity is exceeded, automatically evicts the oldest event from head.
   */
  public addEvent(event: ControllerEvent): void {
    this.eventList.append(event);
  }

  /**
   * Bulk appends events to the linked list.
   */
  public addEvents(events: ControllerEvent[]): void {
    events.forEach((e) => this.eventList.append(e));
  }

  /**
   * Returns an immutable array snapshot for React rendering without state mutation.
   * Time Complexity: O(N)
   */
  public getEvents(): ControllerEvent[] {
    return this.eventList.toArray();
  }

  /**
   * Executes the recursive analysis algorithm on the current linked list contents.
   */
  public getRecursiveAnalysis(): RecursiveDiagnosticMetrics {
    const eventsArray = this.eventList.toArray();
    return analyzeEventsRecursively(eventsArray);
  }

  /**
   * Exposes linked-list structural health metrics for the diagnostics console.
   */
  public getLinkedListMetrics(): {
    size: number;
    capacity?: number;
    headEventId: string | null;
    tailEventId: string | null;
    headTimestamp: string | null;
    tailTimestamp: string | null;
  } {
    return {
      size: this.eventList.size(),
      capacity: this.eventList.capacity,
      headEventId: this.eventList.head ? this.eventList.head.value.id : null,
      tailEventId: this.eventList.tail ? this.eventList.tail.value.id : null,
      headTimestamp: this.eventList.head ? this.eventList.head.value.timestamp : null,
      tailTimestamp: this.eventList.tail ? this.eventList.tail.value.timestamp : null,
    };
  }

  /**
   * Clears the event linked list.
   */
  public clear(): void {
    this.eventList.clear();
  }
}
